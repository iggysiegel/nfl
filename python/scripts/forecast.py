"""Fit through the latest completed games and forecast a week of games.

Saves the fitted posterior to ``models/``, archives the week's predictions CSV in
``predictions/``, and prints the report.

Usage:
    python -m scripts.forecast
    python -m scripts.forecast --season 2026 --week 1
    python -m scripts.forecast --draws 500 --tune 500 --no-progress

Without --season and --week, forecasts the first week with an unplayed game.
"""

import argparse

from nfl.data import DataLoader, upcoming_week
from nfl.model import StateSpaceModel
from nfl.paths import MODELS_DIR, PREDICTIONS_DIR
from nfl.predict import fit_week, predict_week
from nfl.report import Formatter


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse the forecast target and sampler settings."""
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--season", type=int, help="season to forecast")
    parser.add_argument("--week", type=int, help="week to forecast")
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
        "--reuse-trace",
        action="store_true",
        help="predict from the saved posterior for this week instead of fitting",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Fit, save the posterior, archive the predictions, and print the report."""
    args = parse_args(argv)
    if args.season is None or args.week is None:
        season, week = upcoming_week()
    else:
        season, week = args.season, args.week

    print(f"{season} week {week}: fitting...")
    loader = DataLoader(season - args.train_window, season)
    trace_path = MODELS_DIR / f"model_{season}_{week:02d}.nc"

    if args.reuse_trace and trace_path.exists():
        model = StateSpaceModel()
        model.load(trace_path)
        games = loader.data
        week_games = games[(games["season"] == season) & (games["week"] == week)]
        if week_games.empty:
            raise ValueError(f"no games for {season} week {week}")
        prediction = predict_week(model.trace, week_games)
    else:
        model, prediction = fit_week(
            loader.data,
            season,
            week,
            args.train_window,
            draws=args.draws,
            tune=args.tune,
            chains=args.chains,
            cores=args.cores,
            target_accept=args.target_accept,
            random_seed=args.random_seed,
            progressbar=args.progress,
        )
        MODELS_DIR.mkdir(exist_ok=True)
        model.save(trace_path)

    PREDICTIONS_DIR.mkdir(exist_ok=True)
    prediction.to_csv(
        PREDICTIONS_DIR / f"predictions_{season}_{week:02d}.csv", index=False
    )
    Formatter().print_report(prediction)


if __name__ == "__main__":
    main()
