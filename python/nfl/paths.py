"""Project directory paths."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
PREDICTIONS_DIR = Path(os.environ.get("PREDICTIONS_DIR", BASE_DIR / "predictions"))
MODELS_DIR = Path(os.environ.get("MODELS_DIR", BASE_DIR / "models"))
