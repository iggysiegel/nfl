import type { Board, History } from '@/data/types';
import boardJson from './board.json';
import historyJson from './history.json';

/* The one place the baked payloads are given their types. Both files are written by
   `npm run build:data` from the predictions checkout, and neither is checked in. */
export const board = boardJson as unknown as Board;
export const history = historyJson as unknown as History;
