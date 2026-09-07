"""A state-space model for NFL score margins (home minus away).

Glickman and Stern (1998): latent team strengths follow an autoregressive walk over
weeks, and each game's margin is normal around the strength difference plus the home
team's home-field advantage. Added here: a coefficient on the external pre-game
quarterback rating difference. Fit with NUTS via PyMC.
"""

import arviz as az
import numpy as np
import pandas as pd
import pymc as pm
import pytensor
import pytensor.tensor as pt
import xarray as xr

# Priors follow Glickman and Stern (1998), Section 2. The paper puts diffuse gamma
# priors on precisions; for NUTS we put HalfNormal priors on the standard deviations
# instead, each scaled to the paper's prior value (in points). Paper posteriors, for
# reference: tau 12.8, sigma_0 3.3, sigma_w 0.9, sigma_s 2.4, sigma_hfa 2.3.
OBS_SD_PRIOR = 10.0  # tau: single-game SD
INITIAL_SD_PRIOR = 4.0  # sigma_0: initial team-strength SD
WEEK_SD_PRIOR = 1.3  # sigma_w: between-week evolution SD
SEASON_SD_PRIOR = 2.5  # sigma_s: between-season evolution SD
HFA_TEAM_SD_PRIOR = 4.0  # sigma_hfa: team-to-team spread of home-field advantage

# Autoregressive coefficients of the team-strength walk (Normal), as in the paper.
WEEK_AR_PRIOR_MEAN = 0.995
WEEK_AR_PRIOR_SD = 1.0
SEASON_AR_PRIOR_MEAN = 0.98
SEASON_AR_PRIOR_SD = 1.0

# League-wide home-field advantage (Normal), in points. The paper fixes it at 3;
# it has since fallen to about 2.
HFA_PRIOR_MEAN = 2.0
HFA_PRIOR_SD = 1.5

# Quarterback coefficient (Normal), in margin points per nfelo Elo point, centered
# on the known 1/25 conversion. Kept tight: the ratings overlap with team strength,
# and a loose prior lets the two trade that shared signal between fits.
GAMMA_PRIOR_MEAN = 0.04
GAMMA_PRIOR_SD = 0.02


class StateSpaceModel:
    """The margin model: build from played games, fit, save, and load."""

    def __init__(self, games: pd.DataFrame | None = None):
        """Build the PyMC model for a frame of played games.

        Args:
            games: Rows of ``DataLoader.data`` with an observed margin. Omit to
                ``load`` a saved trace instead of fitting.
        """
        self.model = self.build(games) if games is not None else None
        self.trace = None

    def build(self, games: pd.DataFrame) -> pm.Model:
        """Construct the PyMC model.

        Args:
            games: Played games (rows of ``DataLoader.data``).

        Returns:
            An unsampled PyMC model with named coordinates (``team``, ``week``,
            ``transition``, ``game``).
        """
        games = games.sort_values(["season", "week"]).reset_index(drop=True)

        # Teams in index order, and each game's sides as indices.
        teams = sorted(set(games["home_team"]) | set(games["away_team"]))
        team_index = {team: i for i, team in enumerate(teams)}
        home = games["home_team"].map(team_index).to_numpy()
        away = games["away_team"].map(team_index).to_numpy()

        # One time step per (season, week), in order; the transition into a new
        # season is a season start.
        steps = games[["season", "week"]].drop_duplicates()
        weeks = [
            f"{season}-W{week:02d}"
            for season, week in zip(steps["season"], steps["week"], strict=True)
        ]
        week_of_game = games.groupby(["season", "week"]).ngroup().to_numpy()
        seasons = steps["season"].to_numpy()
        is_season_start = seasons[1:] != seasons[:-1]

        at_home = (games["location"] == "Home").to_numpy(dtype=float)
        qb_diff = games["qb_diff"].to_numpy(dtype=float)
        margin = games["margin"].to_numpy(dtype=float)

        coords = {
            "team": teams,
            "week": weeks,
            "transition": weeks[1:],
            "game": np.arange(len(games)),
        }
        with pm.Model(coords=coords) as model:
            # Observation and evolution scales.
            tau = pm.HalfNormal("tau", sigma=OBS_SD_PRIOR)
            sigma_w = pm.HalfNormal("sigma_w", sigma=WEEK_SD_PRIOR)
            sigma_s = pm.HalfNormal("sigma_s", sigma=SEASON_SD_PRIOR)
            sigma_0 = pm.HalfNormal("sigma_0", sigma=INITIAL_SD_PRIOR)

            # Autoregressive coefficients of the team-strength walk.
            beta_w = pm.Normal("beta_w", mu=WEEK_AR_PRIOR_MEAN, sigma=WEEK_AR_PRIOR_SD)
            beta_s = pm.Normal(
                "beta_s", mu=SEASON_AR_PRIOR_MEAN, sigma=SEASON_AR_PRIOR_SD
            )

            # Per-team home-field advantage around the league level (non-centered).
            alpha = pm.Normal("alpha", mu=HFA_PRIOR_MEAN, sigma=HFA_PRIOR_SD)
            sigma_hfa = pm.HalfNormal("sigma_hfa", sigma=HFA_TEAM_SD_PRIOR)
            hfa_z = pm.Normal("hfa_z", mu=0.0, sigma=1.0, dims="team")
            hfa = pm.Deterministic("hfa", alpha + sigma_hfa * hfa_z, dims="team")

            # Coefficient turning the quarterback rating difference into points.
            gamma = pm.Normal("gamma", mu=GAMMA_PRIOR_MEAN, sigma=GAMMA_PRIOR_SD)

            # Standard sum-to-zero innovations; scaled by the SDs below
            # (non-centered).
            init_z = pm.ZeroSumNormal("theta_init_z", sigma=1.0, dims="team")
            innov_z = pm.ZeroSumNormal(
                "theta_innov_z", sigma=1.0, dims=("transition", "team")
            )

            # Per transition: the between-season coefficient and scale at a season
            # opener, the within-season pair otherwise.
            beta = pt.where(is_season_start, beta_s, beta_w)
            sigma = pt.where(is_season_start, sigma_s, sigma_w)

            # One week of the team-strength walk: last week carried forward, scaled,
            # plus a scaled innovation.
            def walk_step(beta_week, sigma_week, innovation, previous_strength):
                return beta_week * previous_strength + sigma_week * innovation

            first_strength = sigma_0 * init_z
            later_strengths = pytensor.scan(
                fn=walk_step,
                sequences=[beta, sigma, innov_z],
                outputs_info=[first_strength],
                return_updates=False,
            )
            theta = pm.Deterministic(
                "theta",
                pt.concatenate([first_strength[None, :], later_strengths], axis=0),
                dims=("week", "team"),
            )

            # Game mean: strength difference, home-field advantage (zeroed at
            # neutral sites by at_home), and the quarterback term.
            home_field = hfa[home] * at_home
            mu = (
                theta[week_of_game, home]
                - theta[week_of_game, away]
                + home_field
                + gamma * qb_diff
            )
            pm.Normal("margin", mu=mu, sigma=tau, observed=margin, dims="game")
        return model

    def fit(
        self,
        draws: int = 2000,
        tune: int = 2000,
        chains: int = 4,
        cores: int | None = None,
        target_accept: float = 0.98,
        random_seed: int = 1,
        progressbar: bool = True,
    ) -> None:
        """Sample the model with NUTS, keep the trace, and print diagnostics.

        Args:
            draws: Posterior draws per chain.
            tune: Tuning (warmup) iterations per chain.
            chains: Number of chains.
            cores: Parallel chains; ``None`` lets PyMC choose.
            target_accept: NUTS target acceptance probability.
            random_seed: Seed for reproducibility.
            progressbar: Show the sampling progress bar.
        """
        with self.model:
            self.trace = pm.sample(
                draws=draws,
                tune=tune,
                chains=chains,
                cores=cores,
                target_accept=target_accept,
                random_seed=random_seed,
                progressbar=progressbar,
            )
        summary = az.summary(self.trace)
        divergences = int(self.trace.sample_stats["diverging"].sum())
        print(
            f"Fit diagnostics: max R-hat {summary['r_hat'].max():.3f}, "
            f"min bulk ESS {summary['ess_bulk'].min():.0f}, "
            f"{divergences} divergence(s)"
        )

    def save(self, path) -> None:
        """Write the trace to a NetCDF file, keeping only what prediction reads.

        Args:
            path: Destination file path.
        """
        helpers = ["sigma_0", "hfa_z", "theta_init_z", "theta_innov_z"]
        posterior = self.trace.posterior.dataset.drop_vars(helpers, errors="ignore")
        slim = posterior.isel(week=[-1])
        xr.DataTree.from_dict({"posterior": slim}).to_netcdf(path)

    def load(self, path) -> None:
        """Restore a trace from a file written by ``save``.

        Args:
            path: NetCDF file path.
        """
        self.trace = az.from_netcdf(path)
