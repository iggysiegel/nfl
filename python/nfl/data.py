"""Load and join NFL game data for the margin model.

``DataLoader`` builds one game-level frame from three sources: the nflverse schedule
(games, scores, closing spread), the nfelo market archive (opening spread), and the
nfeloqb file (each side's pre-game quarterback rating, including projected starters
for upcoming games).
"""

import nflreadpy
import pandas as pd

FIRST_SEASON = 1999
KICKOFF_TZ = "America/New_York"
KICKOFF_FORMAT = "%Y-%m-%dT%H:%M:%S%z"

TEAM_NAME_MAP = {
    "STL": "LA",  # St. Louis Rams -> Los Angeles (2016)
    "LAR": "LA",  # nfelo's code for the Rams
    "SD": "LAC",  # San Diego Chargers -> Los Angeles (2017)
    "OAK": "LV",  # Oakland Raiders -> Las Vegas (2020)
}

QB_ELOS_URL = "https://raw.githubusercontent.com/greerreNFL/nfeloqb/main/qb_elos.csv"
OPEN_LINES_URL = (
    "https://raw.githubusercontent.com/greerreNFL/nfelomarket_data/"
    "refs/heads/main/Data/lines.csv"
)


def upcoming_week() -> tuple[int, int]:
    """The season and week of the first unplayed game on the published schedules.

    Raises:
        ValueError: If every scheduled game has been played (the offseason).
    """
    schedule = nflreadpy.load_schedules(seasons=True).to_pandas()
    unplayed = schedule[schedule["result"].isna()].sort_values(["season", "week"])
    if unplayed.empty:
        raise ValueError("Every scheduled game has been played; nothing to forecast.")
    return int(unplayed["season"].iloc[0]), int(unplayed["week"].iloc[0])


class DataLoader:
    """Load and join NFL game data for a range of seasons."""

    def __init__(self, start_season: int, end_season: int):
        """Load, join, and trim the game data.

        Args:
            start_season: First season to load (1999 or later).
            end_season: Final season to load (no later than the upcoming season).

        Raises:
            ValueError: If a requested season has no published schedule.
        """
        self.start_season = start_season
        self.end_season = end_season
        self.load_schedule()
        self.add_open_lines()
        self.add_qb_values()
        self.select_features()

    def load_schedule(self):
        """Load the schedule with the home-minus-away margin (NaN for unplayed)."""
        seasons = list(range(self.start_season, self.end_season + 1))
        schedule = nflreadpy.load_schedules(seasons=seasons).to_pandas()

        # nflreadpy returns no rows, rather than an error, for a season it lacks.
        missing = sorted(set(seasons) - set(schedule["season"]))
        if missing:
            raise ValueError(f"No schedule published for season(s) {missing}.")

        self.data = schedule[
            [
                "game_id",
                "season",
                "week",
                "gameday",
                "gametime",
                "location",
                "home_team",
                "away_team",
                "home_score",
                "away_score",
                "spread_line",
            ]
        ].copy()
        local = pd.to_datetime(
            self.data.pop("gameday") + " " + self.data.pop("gametime")
        )
        self.data["kickoff"] = local.dt.tz_localize(KICKOFF_TZ).dt.strftime(
            KICKOFF_FORMAT
        )
        self.data["home_team"] = self.data["home_team"].replace(TEAM_NAME_MAP)
        self.data["away_team"] = self.data["away_team"].replace(TEAM_NAME_MAP)
        self.data["margin"] = self.data["home_score"] - self.data["away_score"]

    def add_open_lines(self):
        """Join the opening spread, sign-flipped to home-minus-away."""
        raw = pd.read_csv(OPEN_LINES_URL)
        lines = pd.DataFrame(
            {
                "season": raw["season"],
                "week": raw["week"],
                "home_team": raw["home_team"].replace(TEAM_NAME_MAP),
                "away_team": raw["away_team"].replace(TEAM_NAME_MAP),
                "spread_line_open": -raw["home_spread_open"],
            }
        )
        self.data = pd.merge(
            self.data,
            lines,
            on=["season", "week", "home_team", "away_team"],
            how="left",
        )

    def add_qb_values(self):
        """Join each game's pre-game quarterback ratings and their difference.

        nfeloqb's ``team1`` is the home team. A game without a row -- only possible for
        an upcoming game nfeloqb has not rated yet -- keeps ``qb_diff`` at 0.0.
        """
        raw = pd.read_csv(QB_ELOS_URL)
        raw = raw[raw["season"] >= FIRST_SEASON]
        qb_values = pd.DataFrame(
            {
                "season": raw["season"],
                "week": raw["week"].astype(int),
                "home_team": raw["team1"].replace(TEAM_NAME_MAP),
                "away_team": raw["team2"].replace(TEAM_NAME_MAP),
                "home_qb_name": raw["qb1"],
                "away_qb_name": raw["qb2"],
                "home_qb_value": raw["qb1_value_pre"],
                "away_qb_value": raw["qb2_value_pre"],
            }
        )
        self.data = pd.merge(
            self.data,
            qb_values,
            on=["season", "week", "home_team", "away_team"],
            how="left",
        )
        # An upcoming game nfeloqb has not rated yet counts as evenly matched.
        self.data["qb_diff"] = (
            self.data["home_qb_value"] - self.data["away_qb_value"]
        ).fillna(0.0)

    def select_features(self):
        """Keep the modeling and reporting columns."""
        self.data = self.data[
            [
                "game_id",
                "season",
                "week",
                "kickoff",
                "location",
                "home_team",
                "away_team",
                "home_qb_name",
                "away_qb_name",
                "home_qb_value",
                "away_qb_value",
                "qb_diff",
                "spread_line_open",
                "spread_line",
                "margin",
            ]
        ]
