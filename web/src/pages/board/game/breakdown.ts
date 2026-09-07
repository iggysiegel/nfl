import type { Game } from '@/data/types';

export interface MatchupRow {
  label: string;
  /** Each side's own points above league average; null where the term does not apply. */
  away: number | null;
  home: number | null;
  /** Home minus away. Positive favours the home team. */
  edge: number;
  /** Who the two sides are, where naming them helps — "Allen / Stroud". */
  note?: string;
}

/** True when both starting quarterbacks were rated.
 *
 * ``DataLoader`` fills the *difference* to 0 when either side is missing, so one
 * unrated quarterback zeroes the whole term.
 */
export function hasQb(game: Game): boolean {
  return game.homeQb !== null && game.awayQb !== null;
}

/** True at a neutral site, where the model contributes no home-field points.
 *
 * ``predict_week`` drops ``location``, so this is the only signal a prediction
 * carries. It is
 * reliable because the fitted per-team advantage is never exactly zero.
 */
export function isNeutralSite(game: Game): boolean {
  return game.homeField === 0;
}

/** Mean starter rating across a slate, used to centre the per-side split. */
export function leagueQbValue(games: Game[]): number {
  const values = games
    .flatMap((game) => [game.homeQbValue, game.awayQbValue])
    .filter((value): value is number => value !== null);
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Each starter's points above a league-average starter.
 *
 * The model emits one ``qb_effect`` = gamma * (home rating - away rating), so gamma is
 * recoverable per game. Measuring each side against a common ``leagueQbValue`` leaves
 * the two sides differing by exactly ``qbEffect``, whatever that baseline is.
 *
 * Returns null when either starter is unrated: the model contributes nothing, and a
 * zero here would read as "an average quarterback" rather than "no quarterback".
 */
export function qbRatings(
  game: Game,
  leagueQbValue: number,
): { home: number; away: number } | null {
  if (game.homeQbValue === null || game.awayQbValue === null || game.qbDiff === 0) {
    return null;
  }
  const gamma = game.qbEffect / game.qbDiff;
  return {
    home: gamma * (game.homeQbValue - leagueQbValue),
    away: gamma * (game.awayQbValue - leagueQbValue),
  };
}

/** The prediction as a head-to-head: each side's contribution, and the net.
 *
 * The edges sum to ``predMean`` exactly, because they are the model's own terms
 * regrouped — strength difference, quarterback term, home field.
 */
export function matchupRows(game: Game, leagueQbValue: number): MatchupRow[] {
  const qb = qbRatings(game, leagueQbValue);
  return [
    {
      label: 'Team strength',
      away: game.awayStrength,
      home: game.homeStrength,
      edge: game.homeStrength - game.awayStrength,
    },
    {
      label: 'Quarterback',
      away: qb?.away ?? null,
      home: qb?.home ?? null,
      edge: game.qbEffect,
      note: qb === null ? undefined : `${game.awayQb} / ${game.homeQb}`,
    },
    { label: 'Home field', away: null, home: game.homeField, edge: game.homeField },
  ];
}
