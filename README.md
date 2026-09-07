# nfl

## Overview

An extension of the [Glickman-Stern model](https://www.glicko.net/research/nfl.pdf) for NFL predictions, adding quarterback effects.

- [Visit the website](https://iggysiegel.github.io/nfl/)

## Installation

To view this week's predictions, check out the website linked above.

If you want to fit the full state-space model yourself, create the conda environment provided. This project uses conda because PyMC and some of its dependencies install more reliably via conda channels.

```bash
conda env create -f python/environment.yml
conda activate nfl
```

The site is a separate npm project:

```bash
cd web && npm install
```

## Usage

Model commands run from `python/`.

Fit the full state-space model from scratch (2-3 min runtime depending on hardware):

```bash
python -m scripts.forecast
```

## Data

Predictions are published to the `data` branch, one CSV per week going back to 2015. Each row holds the game, both starting quarterbacks and their ratings, the opening and closing odds, the actual
margin, and the full predicted distribution.
