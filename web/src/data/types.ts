/** One game's forecast exactly as ``predict_week`` emits it — the row the build reads
 * from a prediction CSV.
 *
 * Every margin-like value is home minus away, matching the Python. The flip to
 * market convention (negative = home favoured) happens at render time only.
 */
export interface Prediction {
  gameId: string;
  season: number;
  week: number;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeQb: string | null;
  awayQb: string | null;
  homeQbValue: number | null;
  awayQbValue: number | null;
  qbDiff: number;
  spreadOpen: number | null;
  spreadClose: number | null;
  /** null when the game has not been played. */
  margin: number | null;
  predMean: number;
  predSd: number;
  homeStrength: number;
  awayStrength: number;
  homeField: number;
  qbEffect: number;
  /** The predictive grid q01..q99, 99 values. */
  quantiles: number[];
}

/** One game as the site shows it.
 *
 * The quantile grid collapses to the single `confidence` value the site derives from
 * it, and the played result drops out — neither is read in the browser, and the grid
 * alone was four fifths of the payload. The build does that reduction once.
 */
export type Game = Omit<Prediction, 'quantiles' | 'margin'> & {
  /** How far the closing line sits from the centre of the model's distribution,
   *  or null when no line was posted. */
  confidence: number | null;
};

/** A record over decided games only. A push — the margin landing exactly on the line —
 *  is not an outcome the model got right or wrong, so it is left out rather than
 *  counted, and every count on the site is therefore wins + losses. */
export interface AtsRecord {
  wins: number;
  losses: number;
}

/** The week currently on the board. */
export interface Board {
  season: number;
  week: number;
  generatedAt: string;
  games: Game[];
  /** Season to date, so week 1 of a new season is legitimately empty. */
  seasonAts: { closing: AtsRecord; opening: AtsRecord };
}

/** Which market line a figure is measured against. */
export type MarketLine = 'closing' | 'opening';

export interface ConfidenceBand {
  label: string;
  /** Whether games in this band clear the threshold and are actually backed. */
  bet: boolean;
  games: number;
  /** Share of decided games covered, or null when the band is empty. */
  coverRate: number | null;
}

export interface Totals {
  atsClosing: AtsRecord;
  atsOpening: AtsRecord;
  /** Mean closing line value in points, or null with no opening lines. */
  clv: number | null;
  modelMae: number | null;
  marketMae: number | null;
}

export interface SeasonRow extends Totals {
  season: number;
}

/** Everything the About view shows, pre-aggregated over every past prediction. */
export interface History {
  /** Cover rate by confidence, one set per line. Each set buckets and scores against
   *  that same line, so a set is internally consistent and the two are comparable. */
  bands: Record<MarketLine, ConfidenceBand[]>;
  seasons: SeasonRow[];
  allTime: Totals;
}
