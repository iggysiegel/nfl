"""Walk past seasons forward week by week, then score the accumulated predictions.

Each week's predictions land in ``predictions/`` as their fit finishes; rerunning the
same command skips weeks already on disk, so an interrupted run resumes where it
stopped.

Usage:
    python -m scripts.backtest --start-season 2019 --end-season 2025
    python -m scripts.backtest --start-season 2024 --end-season 2024 --end-week 9
    python -m scripts.backtest --start-season 2025 --end-season 2025 --no-resume
"""

import argparse

import pandas as pd

from nfl.data import DataLoader
from nfl.paths import PREDICTIONS_DIR
from nfl.predict import fit_week, score


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse the backtest range and sampler settings."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--start-season", type=int, required=True, help="first season to forecast"
    )
    parser.add_argument(
        "--start-week",
        type=int,
        default=1,
        help="first week of the start season (default: %(default)s)",
    )
    parser.add_argument(
        "--end-season", type=int, required=True, help="last season to forecast"
    )
    parser.add_argument(
        "--end-week",
        type=int,
        default=None,
        help="last week of the end season (default: its last played week)",
    )
    parser.add_argument(
        "--train-window",
        type=int,
        default=5,
        help="prior seasons in the fit (default: %(default)s)",
    )
    parser.add_argument(
        "--draws",
        type=int,
        default=2000,
        help="posterior draws per chain (default: %(default)s)",
    )
    parser.add_argument(
        "--tune",
        type=int,
        default=2000,
        help="tuning iterations per chain (default: %(default)s)",
    )
    parser.add_argument(
        "--chains", type=int, default=4, help="number of chains (default: %(default)s)"
    )
    parser.add_argument(
        "--cores",
        type=int,
        default=None,
        help="parallel chains (default: PyMC chooses)",
    )
    parser.add_argument(
        "--target-accept",
        type=float,
        default=0.98,
        help="NUTS target acceptance probability (default: %(default)s)",
    )
    parser.add_argument(
        "--random-seed", type=int, default=1, help="sampler seed (default: %(default)s)"
    )
    parser.add_argument(
        "--progress",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="show the sampling progress bar",
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        help="refit and overwrite weeks already on disk",
    )
    return parser.parse_args(argv)


def weeks_to_run(
    played_weeks: list[int],
    season: int,
    args: argparse.Namespace,
) -> list[int]:
    """Trim a season's played weeks to the requested start/end boundaries."""
    weeks = played_weeks
    if season == args.start_season:
        weeks = [week for week in weeks if week >= args.start_week]
    if season == args.end_season and args.end_week is not None:
        weeks = [week for week in weeks if week <= args.end_week]
    return weeks


def main(argv: list[str] | None = None) -> None:
    """Run the walk-forward backtest and print the score table."""
    args = parse_args(argv)
    loader = DataLoader(args.start_season - args.train_window, args.end_season)
    sampler = {
        "draws": args.draws,
        "tune": args.tune,
        "chains": args.chains,
        "cores": args.cores,
        "target_accept": args.target_accept,
        "random_seed": args.random_seed,
        "progressbar": args.progress,
    }

    PREDICTIONS_DIR.mkdir(exist_ok=True)
    for season in range(args.start_season, args.end_season + 1):
        played = loader.data[
            (loader.data["season"] == season) & loader.data["margin"].notna()
        ]
        played_weeks = sorted(int(week) for week in played["week"].unique())
        for week in weeks_to_run(played_weeks, season, args):
            path = PREDICTIONS_DIR / f"predictions_{season}_{week:02d}.csv"
            if path.exists() and not args.no_resume:
                print(f"{season} week {week}: already done, skipping")
                continue
            print(f"{season} week {week}: fitting...")
            try:
                _, prediction = fit_week(
                    loader.data, season, week, args.train_window, **sampler
                )
            except Exception as error:
                # Report the failed fit and move on; rerunning retries the gap.
                print(f"{season} week {week}: FAILED: {error}")
                continue
            prediction.to_csv(path, index=False)

    files = sorted(PREDICTIONS_DIR.glob("predictions_*.csv"))
    predictions = pd.concat([pd.read_csv(file) for file in files], ignore_index=True)
    print(score(predictions).to_string(index=False))


if __name__ == "__main__":
    main()
