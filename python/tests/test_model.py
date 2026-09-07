"""Tests for the model: the team-strength walk."""

import numpy as np
import pandas as pd

from nfl.model import StateSpaceModel

# --- Test setup ---


def _played_games(weeks) -> pd.DataFrame:
    """A minimal frame of played games, one per week label, A hosting B."""
    return pd.DataFrame(
        {
            "season": [int(label[:4]) for label in weeks],
            "week": [int(label[-2:]) for label in weeks],
            "home_team": "A",
            "away_team": "B",
            "location": "Home",
            "margin": 0.0,
            "qb_diff": 0.0,
        }
    )


def _recursion(
    init_z, innov_z, is_season_start, sigma_0, sigma_w, sigma_s, beta_w, beta_s
):
    """The team-strength walk spelled out one week at a time, as a reference."""
    strengths = [sigma_0 * init_z]
    for opener, innovation in zip(is_season_start, innov_z, strict=True):
        beta = beta_s if opener else beta_w
        sigma = sigma_s if opener else sigma_w
        strengths.append(beta * strengths[-1] + sigma * innovation)
    return np.stack(strengths)


# --- Tests ---


def test_team_strength_walk_matches_recursion():
    # The model's scan must produce the same strengths as the walk written out one
    # week at a time. A wrong walk still samples fine, so only arithmetic catches it.
    # Two seasons of two weeks: one within-season step and one season opener.
    weeks = ["2020-W01", "2020-W02", "2021-W01", "2021-W02"]
    is_season_start = [False, True, False]
    n_teams = 2

    # Fixed inputs to the walk: innovations, scales, and coefficients.
    rng = np.random.default_rng(0)
    init_z = rng.standard_normal(n_teams)
    innov_z = rng.standard_normal((len(is_season_start), n_teams))
    sigma_0, sigma_w, sigma_s, beta_w, beta_s = 3.6, 0.89, 3.3, 0.99, 0.64

    # The model's walk: evaluate theta at those inputs, without sampling.
    model = StateSpaceModel(_played_games(weeks)).model
    theta = model["theta"].eval(
        {
            model["theta_init_z"]: init_z,
            model["theta_innov_z"]: innov_z,
            model["sigma_0"]: sigma_0,
            model["sigma_w"]: sigma_w,
            model["sigma_s"]: sigma_s,
            model["beta_w"]: beta_w,
            model["beta_s"]: beta_s,
        }
    )

    # The reference walk: the same recursion in plain Python.
    expected = _recursion(
        init_z, innov_z, is_season_start, sigma_0, sigma_w, sigma_s, beta_w, beta_s
    )

    # The weeks must be in the format predict_week parses, and the walks must agree.
    assert list(model.coords["week"]) == weeks
    np.testing.assert_allclose(theta, expected, atol=1e-8)
