/* Where the build reads predictions and writes the baked JSON. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Set PREDICTIONS_DIR to read a checkout somewhere other than <repo>/predictions. */
export const PREDICTIONS_DIR =
  process.env.PREDICTIONS_DIR ?? join(HERE, '..', '..', 'predictions');

/** The baked JSON the site imports. Gitignored. */
export const DATA_DIR = join(HERE, '..', 'src', 'data');

/** Written by `npm run build:insights`, read by `npm run build:data` when present. */
export const INSIGHTS_PATH = join(DATA_DIR, 'insights.json');
