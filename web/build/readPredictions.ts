/* Read the predictions checkout: one CSV per week, exactly what `predict_week` emits. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Prediction } from '@/data/types';

const QUANTILE_COUNT = 99;

type Row = Record<string, string>;

/** Parse a pandas-written CSV. Fields are never quoted, so a row that does not match
 *  the header width means an unescaped comma reached the data — fail loudly. */
export function parseCsv(text: string, source: string): Row[] {
  const [headerLine, ...lines] = text.trim().split('\n');
  if (!headerLine) throw new Error(`${source}: empty file`);
  const header = headerLine.split(',');
  return lines.map((line, index) => {
    const fields = line.split(',');
    if (fields.length !== header.length) {
      throw new Error(
        `${source}: row ${index + 2} has ${fields.length} fields, expected ${header.length}`,
      );
    }
    return Object.fromEntries(header.map((name, i) => [name, fields[i] ?? '']));
  });
}

const text = (row: Row, key: string): string | null => (row[key] ? row[key] : null);
const number = (row: Row, key: string): number | null => {
  const raw = text(row, key);
  return raw === null ? null : Number(raw);
};

function required(row: Row, key: string, source: string): number {
  const value = number(row, key);
  if (value === null || Number.isNaN(value)) throw new Error(`${source}: missing ${key}`);
  return value;
}

/** The waterfall the site draws only adds up because the model emits these four terms
 *  and nothing else. If that ever stops holding, fail the build rather than ship a
 *  breakdown that silently disagrees with its own total. */
function assertBreakdownSums(game: Prediction, source: string): void {
  const total = game.homeStrength - game.awayStrength + game.homeField + game.qbEffect;
  if (Math.abs(total - game.predMean) > 1e-9) {
    throw new Error(
      `${source}: ${game.gameId} breakdown sums to ${total}, but pred_mean is ${game.predMean}`,
    );
  }
}

export function toPrediction(row: Row, source: string): Prediction {
  const game: Prediction = {
    gameId: row.game_id ?? '',
    season: required(row, 'season', source),
    week: required(row, 'week', source),
    kickoff: row.kickoff ?? '',
    homeTeam: row.home_team ?? '',
    awayTeam: row.away_team ?? '',
    homeQb: text(row, 'home_qb_name'),
    awayQb: text(row, 'away_qb_name'),
    homeQbValue: number(row, 'home_qb_value'),
    awayQbValue: number(row, 'away_qb_value'),
    qbDiff: required(row, 'qb_diff', source),
    spreadOpen: number(row, 'spread_line_open'),
    spreadClose: number(row, 'spread_line'),
    margin: number(row, 'margin'),
    predMean: required(row, 'pred_mean', source),
    predSd: required(row, 'pred_sd', source),
    homeStrength: required(row, 'home_strength', source),
    awayStrength: required(row, 'away_strength', source),
    homeField: required(row, 'home_field', source),
    qbEffect: required(row, 'qb_effect', source),
    quantiles: Array.from({ length: QUANTILE_COUNT }, (_, i) =>
      required(row, `q${String(i + 1).padStart(2, '0')}`, source),
    ),
  };
  assertBreakdownSums(game, source);
  return game;
}

export function readPredictions(directory: string): Prediction[] {
  // A fresh clone has no predictions/ — they live on their own branch — so say where
  // the build looked and how to point it somewhere else.
  if (!existsSync(directory)) {
    throw new Error(
      `no predictions directory at ${directory}. Check out the predictions data, or set PREDICTIONS_DIR to where it lives.`,
    );
  }
  const files = readdirSync(directory)
    .filter((file) => file.startsWith('predictions_') && file.endsWith('.csv'))
    .sort();
  if (files.length === 0) throw new Error(`no predictions found in ${directory}`);
  return files.flatMap((file) =>
    parseCsv(readFileSync(join(directory, file), 'utf8'), file).map((row) => toPrediction(row, file)),
  );
}
