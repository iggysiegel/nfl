import type { Game, Prediction } from '@/data/types';

/** How far a given market line sits from the centre of the model's distribution.
 *
 * A port of ``Formatter.confidence``: the share of the predictive grid below the
 * line, folded to [0, 1]. 0 means the line sits on the model's median, 1 means it
 * sits outside the model's whole distribution.
 *
 * Build-time only — it needs the quantile grid, which never ships to the browser.
 */
export function confidenceAgainst(
  prediction: Prediction,
  line: number | null,
): number | null {
  if (line === null) return null;
  const below =
    prediction.quantiles.filter((q) => q < line).length / prediction.quantiles.length;
  return Math.abs(2 * below - 1);
}

/** Confidence against the closing line — the value baked into each shipped game. */
export function confidence(prediction: Prediction): number | null {
  return confidenceAgainst(prediction, prediction.spreadClose);
}

/** Points by which the model disagrees with the closing spread. */
export function edge(game: Game): number | null {
  return game.spreadClose === null ? null : game.predMean - game.spreadClose;
}

/** The side the model prefers against the closing spread. */
export function modelSide(game: Game): 'home' | 'away' | null {
  const disagreement = edge(game);
  if (disagreement === null) return null;
  return disagreement >= 0 ? 'home' : 'away';
}
