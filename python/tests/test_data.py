"""Tests for the data layer: uses live nflverse and nfelo files."""

import nflreadpy
import pytest

from nfl.data import FIRST_SEASON, DataLoader

# --- Test setup ---


@pytest.fixture(scope="module")
def loader() -> DataLoader:
    """Every season through the current one, loaded once."""
    return DataLoader(FIRST_SEASON, nflreadpy.get_current_season())


# --- Tests ---


def test_team_codes_collapse_to_32_franchises(loader):
    # Relocated franchises (STL/LA, SD/LAC, OAK/LV) must map to one code each.
    assert loader.data["home_team"].nunique() == 32


def test_every_played_game_has_a_qb_rating(loader):
    # A played game without a rating means the nfeloqb schema or team codes drifted.
    played = loader.data[loader.data["margin"].notna()]
    assert played["home_qb_value"].notna().all()


def test_known_game_has_the_right_sides_and_signs(loader):
    # 2024 week 1, Ravens at Chiefs: Chiefs favored by 3, won by 7. Home QB must
    # be Mahomes (guards nfeloqb's team1-is-home orientation) and both spreads
    # must arrive as +3 (home minus away, not the market's -3).
    game = loader.data[loader.data["game_id"] == "2024_01_BAL_KC"].iloc[0]
    assert game["home_qb_name"] == "Patrick Mahomes"
    assert game["away_qb_name"] == "Lamar Jackson"
    assert game["spread_line_open"] == 3.0
    assert game["spread_line"] == 3.0
    assert game["margin"] == 7
    assert game["kickoff"] == "2024-09-05T20:20:00-0400"


def test_unpublished_season_is_an_error():
    # nflreadpy returns no rows, not an error, for a season it lacks.
    with pytest.raises(ValueError, match="2099"):
        DataLoader(2099, 2099)
