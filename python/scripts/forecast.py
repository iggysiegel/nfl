"""Forecast the upcoming week's games.

Prints the predictions and saves them to ``predictions/``. The fitted model is saved
to ``models/``, so later runs for the same week reuse it instead of refitting; pass
--refit to fit again. If last week's model is still saved, last week's predictions
are first updated with the final scores.

Usage:
    python -m scripts.forecast
    python -m scripts.forecast --season 2026 --week 1
    python -m scripts.forecast --refit --draws 500 --tune 500 --no-progress
"""

import argparse

import pandas as pd

from nfl.data import DataLoader, previous_week, upcoming_week
from nfl.model import StateSpaceModel
from nfl.paths import MODELS_DIR, PREDICTIONS_DIR, model_path, predictions_path
from nfl.predict import fit_week, predict_week
from nfl.report import Formatter


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse the forecast target and sampler settings.

    Args:
        argv: Command-line arguments; ``None`` reads ``sys.argv``.

    Returns:
        The parsed arguments.
    """
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
        "--refit",
        action="store_true",
        help="refit the week instead of using the saved model",
    )
    return parser.parse_args(argv)


def update_week(
    games: pd.DataFrame, season: int, week: int, args: argparse.Namespace
) -> pd.DataFrame:
    """Predict a week from its saved model or a new fit, and save the predictions.

    Args:
        games: ``DataLoader.data``.
        season: The season of the predicted week.
        week: The predicted week number.
        args: Parsed command-line arguments.

    Returns:
        The week's prediction table.
    """
    path = model_path(season, week)
    if path.exists() and not args.refit:
        print(f"{season} week {week}: predicting from the saved model...")
        model = StateSpaceModel()
        model.load(path)
        week_games = games[(games["season"] == season) & (games["week"] == week)]
        prediction = predict_week(model.trace, week_games)
    else:
        print(f"{season} week {week}: fitting...")
        model, prediction = fit_week(
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
        MODELS_DIR.mkdir(exist_ok=True)
        model.save(path)

    PREDICTIONS_DIR.mkdir(exist_ok=True)
    prediction.to_csv(predictions_path(season, week), index=False)
    return prediction


def main(argv: list[str] | None = None) -> None:
    """Forecast the upcoming week's games, updating last week with its final scores.

    Args:
        argv: Command-line arguments; ``None`` reads ``sys.argv``.
    """
    args = parse_args(argv)
    if args.season is None or args.week is None:
        season, week = upcoming_week()
    else:
        season, week = args.season, args.week

    games = DataLoader(season - args.train_window, season).data
    week_games = games[(games["season"] == season) & (games["week"] == week)]
    if week_games["home_qb_value"].isna().all():
        raise ValueError(f"nfeloqb has not rated {season} week {week} yet.")

    # Fill in last week's final scores while its model is still saved.
    previous = previous_week(games, season, week)
    if model_path(*previous).exists():
        update_week(games, *previous, args)
        model_path(*previous).unlink()

    Formatter().print_report(update_week(games, season, week, args))


if __name__ == "__main__":
    main()
