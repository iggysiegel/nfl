import type { Game, Prediction } from '@/data/types';
import { confidence } from '@/lib/confidence';

/** A one-game prediction: SEA hosting NE. Every margin-like value is home minus away.
 *
 * The quantile grid is 1..99, so a line at 100 sits above the whole distribution and
 * a line at 50 sits on its centre. The four breakdown terms sum to ``predMean``.
 */
export function prediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    gameId: '2026_01_NE_SEA',
    season: 2026,
    week: 1,
    kickoff: '2026-09-09T20:20:00-0400',
    homeTeam: 'SEA',
    awayTeam: 'NE',
    homeQb: 'Sam Darnold',
    awayQb: 'Drake Maye',
    homeQbValue: 150,
    awayQbValue: 190,
    qbDiff: -40,
    spreadOpen: 3.5,
    spreadClose: 3.5,
    margin: null,
    predMean: 5,
    predSd: 13,
    homeStrength: 6,
    awayStrength: 2,
    homeField: 2,
    qbEffect: -1,
    quantiles: Array.from({ length: 99 }, (_, i) => i + 1),
    ...overrides,
  };
}

/** The same game as it reaches the browser, with confidence already reduced from the
 *  grid. Pass `confidence` explicitly to test a value other than the fixture's own. */
export function game(overrides: Partial<Game> = {}): Game {
  const { quantiles, margin, ...shown } = prediction();
  return { ...shown, confidence: confidence(prediction()), ...overrides };
}
