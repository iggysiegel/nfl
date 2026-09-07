"""Fit-and-forecast a week of games, and score accumulated forecasts.

``fit_week`` is the one path both scripts use: fit on the training window through
the week before, then ``predict_week`` steps every team's last fitted strength one
transition forward, adds home field and the quarterback term, and integrates over
the posterior draws. ``score`` compares a table of forecasts with the market lines.
"""

import numpy as np
import pandas as pd

from nfl.model import StateSpaceModel


def fit_week(
    games: pd.DataFrame, season: int, week: int, train_window: int = 5, **fit_kwargs
) -> tuple[StateSpaceModel, pd.DataFrame]:
    """Fit through the week before and forecast the given week.

    The fit sees every played game from ``train_window`` seasons before ``season``
    up to (but not including) the predicted week; the forecast covers the week's
    games whether or not they have been played.

    Args:
        games: ``DataLoader.data``.
        season: The season of the predicted week.
        week: The predicted week number.
        train_window: Number of prior seasons in the fit.
        **fit_kwargs: Sampler settings passed to ``StateSpaceModel.fit``.

    Returns:
        The fitted model and the week's prediction table.

    Raises:
        ValueError: If there are no games for the requested week.
    """
    window = games[games["season"] >= season - train_window]
    earlier = (window["season"] < season) | (
        (window["season"] == season) & (window["week"] < week)
    )
    train_games = window[earlier & window["margin"].notna()]
    week_games = window[(window["season"] == season) & (window["week"] == week)]
    if week_games.empty:
        raise ValueError(f"no games for {season} week {week}")

    model = StateSpaceModel(train_games)
    model.fit(**fit_kwargs)
    return model, predict_week(model.trace, week_games)


def predict_week(trace, games: pd.DataFrame) -> pd.DataFrame:
    """Forecast one week of games.

    Args:
        trace: ``StateSpaceModel.trace`` (fitted or loaded).
        games: The week's rows of ``DataLoader.data`` (played or not).

    Returns:
        One row per game: the input columns (``margin`` is NaN if unplayed),
        ``pred_mean`` and ``pred_sd``, the posterior-mean breakdown
        (``home_strength``, ``away_strength``, ``home_field``, ``qb_effect``),
        and the predictive quantiles ``q01`` to ``q99``.
    """
    games = games.reset_index(drop=True)
    # Merge the chain and draw axes into one leading sample axis.
    post = trace.posterior.dataset.stack(sample=("chain", "draw"))
    post = post.transpose("sample", ...)

    # The week opens a new season when its season differs from the last fitted
    # week's, which selects the between-season coefficient and scale.
    last_week = str(post["week"].values[-1])
    season_opener = int(games["season"].iloc[0]) != int(last_week[:4])
    tau = post["tau"].values
    beta = post["beta_s" if season_opener else "beta_w"].values
    sigma = post["sigma_s" if season_opener else "sigma_w"].values

    # Step every team's last fitted strength forward (the innovation's mean is zero;
    # both sides' innovation variances go into the spread), then pick out each
    # game's sides.
    stepped = beta[:, None] * post["theta"].sel(week=last_week).values
    team_index = {team: i for i, team in enumerate(post["team"].values)}
    home = games["home_team"].map(team_index).to_numpy()
    away = games["away_team"].map(team_index).to_numpy()
    at_home = (games["location"] == "Home").to_numpy(dtype=float)

    home_strength = stepped[:, home]
    away_strength = stepped[:, away]
    home_field = post["hfa"].values[:, home] * at_home
    qb_effect = post["gamma"].values[:, None] * games["qb_diff"].to_numpy()
    mean = home_strength - away_strength + home_field + qb_effect
    sd = np.sqrt(tau**2 + 2 * sigma**2)

    # One predictive margin per posterior draw, then the quantile grid.
    rng = np.random.default_rng(0)
    samples = mean + sd[:, None] * rng.standard_normal(mean.shape)
    percentiles = range(1, 100)
    grid = pd.DataFrame(
        np.percentile(samples, percentiles, axis=0).T,
        columns=[f"q{p:02d}" for p in percentiles],
    )

    result = games.drop(columns="location")
    result["pred_mean"] = mean.mean(0)
    result["pred_sd"] = samples.std(0)
    result["home_strength"] = home_strength.mean(0)
    result["away_strength"] = away_strength.mean(0)
    result["home_field"] = home_field.mean(0)
    result["qb_effect"] = qb_effect.mean(0)
    return pd.concat([result, grid], axis=1)


def score(predictions: pd.DataFrame) -> pd.DataFrame:
    """Score forecasts against the played games.

    Args:
        predictions: Rows from ``predict_week`` tables, any number of weeks.

    Returns:
        One row per forecast -- the model, the closing spread, and the opening
        spread -- with ``n_games``, ``mse``, and ``mae``.
    """
    played = predictions.dropna(subset=["margin"])
    forecasts = {
        "model": "pred_mean",
        "closing_spread": "spread_line",
        "opening_spread": "spread_line_open",
    }
    rows = []
    for label, column in forecasts.items():
        games = played.dropna(subset=[column])
        error = games[column] - games["margin"]
        rows.append(
            {
                "forecast": label,
                "n_games": len(games),
                "mse": float((error**2).mean()),
                "mae": float(error.abs().mean()),
            }
        )
    return pd.DataFrame(rows)
