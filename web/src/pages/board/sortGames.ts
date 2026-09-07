import type { Game } from '@/data/types';
import { edge } from '@/lib/confidence';

export type SortKey = 'confidence' | 'kickoff';

/** Order a slate for display.
 *
 * By confidence is the board's default and matches ``Formatter.print_report``: games
 * the model disagrees with most first, games with no line at all last. Ties break on
 * the size of the disagreement.
 */
export function sortGames(games: Game[], key: SortKey): Game[] {
  const sorted = [...games];
  if (key === 'kickoff') {
    return sorted.sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  }
  return sorted.sort((a, b) => {
    const first = a.confidence;
    const second = b.confidence;
    if (first === null || second === null) {
      return (first === null ? 1 : 0) - (second === null ? 1 : 0);
    }
    return second - first || Math.abs(edge(b) ?? 0) - Math.abs(edge(a) ?? 0);
  });
}
