/* Bake the predictions into the static JSON the site ships.
 *
 * Usage: npm run build:data
 * Set PREDICTIONS_DIR to read a checkout somewhere other than <repo>/predictions.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBoard, buildHistory } from './aggregate';
import { readPredictions } from './readPredictions';

const HERE = dirname(fileURLToPath(import.meta.url));
const PREDICTIONS_DIR =
  process.env.PREDICTIONS_DIR ?? join(HERE, '..', '..', 'predictions');
const OUT_DIR = join(HERE, '..', 'src', 'data');

function write(name: string, payload: unknown): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, name);
  writeFileSync(path, `${JSON.stringify(payload)}\n`);
  console.log(`${name}: ${(readFileSync(path).length / 1024).toFixed(1)} KB`);
}

const games = readPredictions(PREDICTIONS_DIR);
const board = buildBoard(games, new Date().toISOString());
console.log(`read ${games.length} games from ${PREDICTIONS_DIR}`);
write('board.json', board);
write('history.json', buildHistory(games));
console.log(`board: ${board.season} week ${board.week}, ${board.games.length} games`);
