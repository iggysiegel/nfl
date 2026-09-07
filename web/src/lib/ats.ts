import { BET_THRESHOLD, CONFIDENCE_CUTS } from '@/config';
import type { AtsRecord, Prediction } from '@/data/types';
import { confidenceAgainst } from '@/lib/confidence';

/** Whether a confidence value clears the threshold and is actually backed.
 *  Takes the value rather than the game, so the browser can ask it of a shipped
 *  game's baked-in confidence without needing the quantile grid. */
export function isBet(confidence: number | null): boolean {
  return confidence !== null && confidence >= BET_THRESHOLD;
}

/** Whether the model backs a side in this game, judged against one line.
 *
 * A bet has to be chosen with the line it is placed at. Selecting on the close and
 * then grading at the open would credit the model for line movement it could not
 * have seen, so each record picks its games with the line it is scored against.
 */
export function isBetAgainst(prediction: Prediction, line: number | null): boolean {
  return isBet(confidenceAgainst(prediction, line));
}

/** The confidence bands the About page charts, derived from `CONFIDENCE_CUTS`.
 *
 * The final band is open-ended on purpose: a confidence of exactly 1 — the market
 * outside the model's whole distribution — is reachable, and a closed top would drop
 * those games out of every band.
 */
export const CONFIDENCE_BANDS = CONFIDENCE_CUTS.map((min, index) => {
  const max = CONFIDENCE_CUTS[index + 1] ?? Infinity;
  const whole = (share: number) => Math.round(share * 100);
  const label =
    index === 0
      ? `<${whole(max)}%`
      : max === Infinity
        ? `${whole(min)}%+`
        : `${whole(min)}–${whole(max)}%`;
  return { label, min, max, bet: min >= BET_THRESHOLD };
});

type Outcome = 'win' | 'loss' | 'push';

/** How the model's side fared against one line, or null if the game cannot be scored. */
export function coverOutcome(game: Prediction, line: number | null): Outcome | null {
  if (line === null || game.margin === null) return null;
  if (game.margin === line) return 'push';
  const side = game.predMean - line >= 0 ? 1 : -1;
  return Math.sign(game.margin - line) === side ? 'win' : 'loss';
}

export function atsRecord(
  games: Prediction[],
  line: (game: Prediction) => number | null,
): AtsRecord {
  const record: AtsRecord = { wins: 0, losses: 0 };
  for (const game of games) {
    const outcome = coverOutcome(game, line(game));
    // A push is dropped, not tallied: it is neither a win nor a loss, and counting it
    // would make the record's total disagree with the cover rate's denominator.
    if (outcome === 'win') record.wins += 1;
    else if (outcome === 'loss') record.losses += 1;
  }
  return record;
}

/** Cover rate over the decided games the record holds. */
export function coverRate(record: AtsRecord): number | null {
  const decided = record.wins + record.losses;
  return decided === 0 ? null : record.wins / decided;
}

/** Points gained against the close by taking the model's side at the open. */
export function closingLineValue(game: Prediction): number | null {
  if (game.spreadOpen === null || game.spreadClose === null) return null;
  const side = game.predMean - game.spreadOpen >= 0 ? 1 : -1;
  return side * (game.spreadClose - game.spreadOpen);
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function meanAbsoluteError(
  games: Prediction[],
  forecast: (game: Prediction) => number | null,
): number | null {
  const errors: number[] = [];
  for (const game of games) {
    const predicted = forecast(game);
    if (game.margin === null || predicted === null) continue;
    errors.push(Math.abs(predicted - game.margin));
  }
  return mean(errors);
}
