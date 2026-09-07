"""Refit the weeks that finished since their predictions were written.

Run by the fit workflow, ahead of forecasting the upcoming week.
"""

import pandas as pd

from nfl.data import DataLoader
from nfl.paths import PREDICTIONS_DIR
from nfl.predict import fit_week

TRAIN_WINDOW = 5


def weeks_missing_results() -> list[tuple[int, int]]:
    """The archived weeks written before their games finished, read from disk alone."""
    weeks = []
    for path in sorted(PREDICTIONS_DIR.glob("predictions_*.csv")):
        stored = pd.read_csv(path, usecols=["season", "week", "margin"])
        if stored["margin"].isna().any():
            weeks.append((int(stored["season"].iloc[0]), int(stored["week"].iloc[0])))
    return weeks


def is_played(games: pd.DataFrame, season: int, week: int) -> bool:
    """Whether every game of a week now has a result; a part-played week does not."""
    played = games[(games["season"] == season) & (games["week"] == week)]
    return not played.empty and played["margin"].notna().all()


def main() -> None:
    """Refit and overwrite every week that has finished since it was written."""
    candidates = weeks_missing_results()
    if not candidates:
        print("every archived week holds its result; nothing to refit")
        return

    seasons = {season for season, _ in candidates}
    loader = DataLoader(min(seasons) - TRAIN_WINDOW, max(seasons))
    weeks = [
        (season, week)
        for season, week in candidates
        if is_played(loader.data, season, week)
    ]
    if not weeks:
        print(f"{len(candidates)} week(s) still in progress; nothing to refit")
        return

    for season, week in weeks:
        print(f"{season} week {week}: refitting against final data...")
        _, prediction = fit_week(
            loader.data, season, week, TRAIN_WINDOW, progressbar=False
        )
        prediction.to_csv(
            PREDICTIONS_DIR / f"predictions_{season}_{week:02d}.csv", index=False
        )


if __name__ == "__main__":
    main()
