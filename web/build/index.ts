/* Bake the predictions into the static JSON the site ships.
 *
 * Usage: npm run build:data
 * Set PREDICTIONS_DIR to read a checkout somewhere other than <repo>/predictions.
 * Folds in src/data/insights.json when `npm run build:insights` has written one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SlateInsights } from '@/data/types';
import { buildBoard, buildHistory } from './aggregate';
import { DATA_DIR, INSIGHTS_PATH, PREDICTIONS_DIR } from './paths';
import { readPredictions } from './readPredictions';

function write(name: string, payload: unknown): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const path = join(DATA_DIR, name);
  writeFileSync(path, `${JSON.stringify(payload)}\n`);
  console.log(`${name}: ${(readFileSync(path).length / 1024).toFixed(1)} KB`);
}

const games = readPredictions(PREDICTIONS_DIR);
const insights = existsSync(INSIGHTS_PATH)
  ? (JSON.parse(readFileSync(INSIGHTS_PATH, 'utf8')) as SlateInsights)
  : null;
const board = buildBoard(games, new Date().toISOString(), insights);
console.log(`read ${games.length} games from ${PREDICTIONS_DIR}`);
write('board.json', board);
write('history.json', buildHistory(games));
console.log(`board: ${board.season} week ${board.week}, ${board.games.length} games`);
