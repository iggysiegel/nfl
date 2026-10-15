"""Forecast next week's games before the current week ends.

Prints the predictions and saves nothing. Starters not yet rated for the week are
each team's most recent starting quarterback.

Usage:
    python -m scripts.preview
    python -m scripts.preview --season 2026 --week 7
    python -m scripts.preview --draws 50 --tune 50 --chains 1
"""

import argparse

from nfl.data import DataLoader, project_starters, unstarted_week
from nfl.predict import fit_week
from nfl.report import Formatter


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse the preview target and sampler settings.

    Args:
        argv: Command-line arguments; ``None`` reads ``sys.argv``.

    Returns:
        The parsed arguments.
    """
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--season", type=int, help="season to preview")
    parser.add_argument("--week", type=int, help="week to preview")
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
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    """Fit through the games played so far and print the week's forecast.

    Args:
        argv: Command-line arguments; ``None`` reads ``sys.argv``.
    """
    args = parse_args(argv)
    if args.season is None or args.week is None:
        season, week = unstarted_week()
    else:
        season, week = args.season, args.week

    games = DataLoader(season - args.train_window, season).data
    games = project_starters(games)
    print(f"{season} week {week}: fitting...")
    _, prediction = fit_week(
        games,
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
    Formatter().print_report(prediction)


if __name__ == "__main__":
    main()
