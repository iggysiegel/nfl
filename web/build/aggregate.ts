/* Reduce the prediction history to the numbers the site shows.
 *
 * Pure: no filesystem, no dates.
 */
import type {
  ConfidenceBand,
  Game,
  History,
  Prediction,
  SeasonRow,
  SlateInsights,
  Totals,
} from "@/data/types";
import {
  atsRecord,
  closingLineValue,
  CONFIDENCE_BANDS,
  coverRate,
  isBetAgainst,
  mean,
  meanAbsoluteError,
} from "@/lib/ats";
import { confidence, confidenceAgainst } from "@/lib/confidence";

const closing = (game: Prediction) => game.spreadClose;
const opening = (game: Prediction) => game.spreadOpen;

/** The games the model backed at a given line. */
const backed = (games: Prediction[], line: (game: Prediction) => number | null) =>
  games.filter((game) => isBetAgainst(game, line(game)));

export function totals(games: Prediction[]): Totals {
  const played = games.filter((game) => game.margin !== null);
  // Each record picks its games with the line it is graded against, so the two cover
  // overlapping but different sets, and there is no single "games bet" count to show.
  // CLV and the error columns are measured over every played game instead.
  return {
    atsClosing: atsRecord(backed(played, closing), closing),
    atsOpening: atsRecord(backed(played, opening), opening),
    clv: mean(
      played
        .map(closingLineValue)
        .filter((value): value is number => value !== null),
    ),
    modelMae: meanAbsoluteError(played, (game) => game.predMean),
    marketMae: meanAbsoluteError(played, closing),
  };
}

/** Cover rate by confidence, bucketed and scored against the same line — so a game is
 *  filed under how far *that* line sat from the model, and graded against *that* line. */
function bandsAgainst(
  games: Prediction[],
  line: (game: Prediction) => number | null,
): ConfidenceBand[] {
  return CONFIDENCE_BANDS.map((band) => {
    const inBand = games.filter((game) => {
      const value = confidenceAgainst(game, line(game));
      return value !== null && value >= band.min && value < band.max;
    });
    const record = atsRecord(inBand, line);
    return {
      label: band.label,
      bet: band.bet,
      games: record.wins + record.losses,
      coverRate: coverRate(record),
    };
  });
}

export function buildHistory(games: Prediction[]): History {
  const played = games.filter((game) => game.margin !== null);
  const seasons = [...new Set(played.map((game) => game.season))].sort(
    (a, b) => b - a,
  );

  const bands = {
    closing: bandsAgainst(played, closing),
    opening: bandsAgainst(played, opening),
  };

  const seasonRows: SeasonRow[] = seasons.map((season) => ({
    season,
    ...totals(played.filter((game) => game.season === season)),
  }));

  return { bands, seasons: seasonRows, allTime: totals(played) };
}

/** Reduce a prediction to what the browser actually needs: the quantile grid becomes
 *  one confidence value, and the played result drops out. */
function toGame(prediction: Prediction, insight: string | null): Game {
  const { quantiles, margin, ...shown } = prediction;
  return { ...shown, confidence: confidence(prediction), insight };
}

/** The most recent week in the predictions. */
export function latestWeek(games: Prediction[]): { season: number; week: number } {
  const latest = games.reduce((best, game) =>
    game.season > best.season ||
    (game.season === best.season && game.week > best.week)
      ? game
      : best,
  );
  return { season: latest.season, week: latest.week };
}

/** The games of one week. */
export function weekGames(
  games: Prediction[],
  { season, week }: { season: number; week: number },
): Prediction[] {
  return games.filter((game) => game.season === season && game.week === week);
}

/** The most recent week, plus that season's record so far. Insights written for a
 *  different week are ignored. */
export function buildBoard(
  games: Prediction[],
  generatedAt: string,
  insights: SlateInsights | null = null,
) {
  const latest = latestWeek(games);
  const decided = games.filter(
    (game) => game.season === latest.season && game.margin !== null,
  );
  const entries =
    insights?.season === latest.season && insights.week === latest.week
      ? insights.games
      : [];
  const insightFor = (game: Prediction) =>
    entries.find(
      (entry) =>
        entry.homeTeam === game.homeTeam && entry.awayTeam === game.awayTeam,
    )?.insight ?? null;
  return {
    season: latest.season,
    week: latest.week,
    generatedAt,
    games: weekGames(games, latest).map((game) =>
      toGame(game, insightFor(game)),
    ),
    seasonAts: {
      closing: atsRecord(backed(decided, closing), closing),
      opening: atsRecord(backed(decided, opening), opening),
    },
  };
}
