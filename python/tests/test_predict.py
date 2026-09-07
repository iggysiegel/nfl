"""Tests for prediction: the forecast arithmetic."""

import arviz as az
import numpy as np
import pandas as pd

from nfl.predict import predict_week

# --- Test setup ---


def _trace():
    """A trace of one hand-built draw ending at 2023 week 18, for exact arithmetic.

    Team A: strength 1, home advantage 2. Team B: strength -2, home advantage 7.
    Strengths carry over by 0.5 within a season and 0.1 across seasons; gamma is
    0.04 points per Elo point.
    """
    draw = {
        "tau": 13.0,
        "sigma_w": 1.0,
        "sigma_s": 3.0,
        "beta_w": 0.5,
        "beta_s": 0.1,
        "gamma": 0.04,
        "hfa": [2.0, 7.0],
        "theta": [[1.0, -2.0]],
    }
    # Give every value the leading chain and draw axes a trace has.
    posterior = {name: np.array(value)[None, None] for name, value in draw.items()}
    return az.from_dict(
        {"posterior": posterior},
        dims={"theta": ["week", "team"], "hfa": ["team"]},
        coords={"week": ["2023-W18"], "team": ["A", "B"]},
    )


def _game(**overrides) -> pd.DataFrame:
    """A one-game frame, A hosting B in 2023 week 18, as predict_week reads it."""
    game = {
        "season": 2023,
        "week": 18,
        "location": "Home",
        "home_team": "A",
        "away_team": "B",
        "qb_diff": 0.0,
    }
    return pd.DataFrame([{**game, **overrides}])


# --- Tests ---


def test_prediction_picks_the_right_sides():
    # Each side must get its own stepped strength and the home team its own
    # advantage. B hosts A, and the teams differ in everything, so a swap would show.
    game = _game(home_team="B", away_team="A", qb_diff=25.0)

    row = predict_week(_trace(), game).iloc[0]

    # Strengths stepped by 0.5; B's advantage; 25 Elo points at 0.04.
    assert row["home_strength"] == -1.0
    assert row["away_strength"] == 0.5
    assert row["home_field"] == 7.0
    assert row["qb_effect"] == 1.0
    assert row["pred_mean"] == -1.0 - 0.5 + 7.0 + 1.0


def test_prediction_uses_season_shrinkage_at_a_season_opener():
    # The fit ends in 2023, so a 2024 week 1 game is a season opener and must step
    # strengths by 0.1, not 0.5.
    game = _game(season=2024, week=1)

    row = predict_week(_trace(), game).iloc[0]

    assert row["home_strength"] == 0.1
    assert row["away_strength"] == -0.2
