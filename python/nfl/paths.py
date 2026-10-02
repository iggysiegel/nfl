"""Project directories and the files saved in them."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
PREDICTIONS_DIR = Path(os.environ.get("PREDICTIONS_DIR", BASE_DIR / "predictions"))
MODELS_DIR = Path(os.environ.get("MODELS_DIR", BASE_DIR / "models"))


def model_path(season: int, week: int) -> Path:
    """Where a week's fitted model is saved.

    Args:
        season: The season of the week.
        week: The week number.

    Returns:
        The model's path under ``MODELS_DIR``.
    """
    return MODELS_DIR / f"model_{season}_{week:02d}.nc"


def predictions_path(season: int, week: int) -> Path:
    """Where a week's predictions CSV is saved.

    Args:
        season: The season of the week.
        week: The week number.

    Returns:
        The CSV's path under ``PREDICTIONS_DIR``.
    """
    return PREDICTIONS_DIR / f"predictions_{season}_{week:02d}.csv"
