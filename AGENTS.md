# AGENTS.md

Bayesian state-space model for NFL score margins. Glickman and Stern (1998) latent
team strengths with a per-team home-field advantage and one external covariate, the
nfeloqb pre-game quarterback rating difference. Fit with NUTS in PyMC.

Two components: the model in `python/`, and the site in `web/` that publishes it.

## Commands

The model runs from `python/`, inside the conda env `nfl`
(`conda env create -f python/environment.yml`). Activate it or call its interpreter
directly. Do not use `conda run`; it swallows stdout.

```
ruff check . && ruff format --check .     # lint, must pass
python -m pytest -q                       # full suite (test_data hits the network)
python -m pytest -q tests/test_model.py tests/test_predict.py   # offline
python -m scripts.forecast
python -m scripts.archive
python -m scripts.backtest --start-season 2019 --end-season 2025
```

A full fit takes 2 to 3 minutes. For a smoke test pass `--draws 50 --tune 50
--chains 1`.

The website is an react / typescript npm project, run from `web/`.

```
npm run dev            # bake the JSON, then serve
npm run build          # bake, typecheck, bundle
npm run lint && npm run test
```

## Rules

- **Never commit.** The maintainer reviews and commits every change.
- **Build only what is asked.** No scaffolding, no forward-looking abstractions,
  no configuration for things that have one value. When in doubt, write less.
- **Readable over clever.** A few cohesive classes with small named methods, type
  hints, and Google-style docstrings in plain English. Short inline comments; never
  paragraph-long ones. Named constants, no magic numbers.
- **Tests guard real behavior only.** A handful of human-readable cases per module,
  each catching something that would otherwise fail silently. Do not add tests for
  coverage, for argparse defaults, or for display formatting. Test files use a
  `# --- Test setup ---` / `# --- Tests ---` layout.
- **Python for the model, TypeScript for the site.** nflreadpy returns Polars;
  convert to pandas at the load boundary and use pandas everywhere else.
- **Python computes nothing the site displays.** It fits, predicts, and writes the
  predictions. Sign flips, confidence, ATS, and every label belong to the web build.

## Model invariants

- The team-strength walk is a `pytensor.scan` recursion. Never rewrite it in closed
  form (cumulative products divided back out); that overflows the gradient and
  produces mass divergences. `test_team_strength_walk_matches_recursion` guards it.
- The walk innovations and the per-team home-field advantage are non-centered.
- Sampler defaults are `draws=2000, tune=2000, chains=4, target_accept=0.98`. At
  0.95 some training windows diverge where `sigma_s` collapses. A healthy fit prints
  0 divergences, max R-hat near 1.01, and min bulk ESS above about 300.
- Priors follow the paper's values, with HalfNormal on standard deviations instead
  of gamma on precisions. The quarterback coefficient prior is deliberately tight
  around 0.04 points per Elo point; loosening it lets the rating and the latent
  strength trade signal between fits.

## Data conventions

- Every margin-like quantity is home minus away internally. The terminal report and
  the site both flip the sign for display.
- Team codes are canonical franchise codes (`LA`, `LAC`, `LV`) via `TEAM_NAME_MAP`;
  `game_id` stays the official nflverse id. Joins key on season, week, and the two
  teams, never on ids.
- nfeloqb's `team1` is the home team. Its `*_value_pre` ratings are pre-game by
  construction, so the walk-forward backtest is leak-free without extra machinery.
  An upcoming game it has not rated yet gets `qb_diff = 0`.
- nflreadpy returns zero rows, not an error, for an unpublished season;
  `DataLoader` turns that into a `ValueError`. Its `get_current_season` is calendar
  based and does not roll over until kickoff, so the forecast script finds the
  upcoming week from the schedule instead (`upcoming_week`).

## Data and deployment

- Predictions live on the orphan `data` branch, never on `main`: one CSV per week,
  holding exactly what `predict_week` emits. It shares no history with `main` and must
  not be merged into it.
- `.github/workflows/`: `ci.yml` lints and tests both components, `deploy.yml`
  publishes to Pages, `fit.yml` refits weekly, `refresh.yml` re-predicts daily from
  the weekly posterior and falls back to a full fit when it is missing or stale.

## Code map

- `python/nfl/data.py` — `DataLoader(start_season, end_season)` joins the schedule,
  the opening line, and the quarterback ratings into one frame; `upcoming_week()`.
- `python/nfl/model.py` — prior constants and `StateSpaceModel`: `build`, `fit`,
  `save`, `load`. Saves keep only the prediction variables and the final week.
- `python/nfl/predict.py` — `fit_week` (the one fit-and-forecast path every script
  uses), `predict_week` (pure numpy on the posterior; `q01` to `q99` grid), `score`.
- `python/nfl/report.py` — `Formatter`: terminal table sorted by confidence.
- `python/nfl/paths.py` — `PREDICTIONS_DIR` and `MODELS_DIR`, each overridden by an
  environment variable of the same name. The web build reads `PREDICTIONS_DIR` too.
- `python/scripts/` — `forecast.py` (`--reuse-trace` predicts from a saved posterior
  instead of refitting), `backtest.py`, `archive.py`.
- `web/build/` reads the prediction CSVs and bakes the JSON the site ships;
  `web/src/` is the React app.
- `predictions/` and `models/` are gitignored.

## References

- Glickman, M. E. and Stern, H. S. (1998). A state-space model for National
  Football League scores. _JASA_ 93(441), 25–35.
  <http://www.glicko.net/research/nfl.pdf>. Section 2 defines the model and
  priors; Table 3 has the posteriors we anchor to.
- nflverse schedules via nflreadpy: <https://nflreadpy.nflverse.com>. Columns and
  the season and week helpers are documented there.
- nfeloqb quarterback ratings: <https://github.com/greerreNFL/nfeloqb>, file
  `qb_elos.csv`. One row per game, `team1` is home, `*_value_pre` is pre-game.
- nfelo market archive (opening lines):
  <https://github.com/greerreNFL/nfelomarket_data>, file `Data/lines.csv`.
- PyMC: <https://www.pymc.io>. The walk uses `pytensor.scan`; see the PyMC docs on
  time series and non-centered parameterization.
