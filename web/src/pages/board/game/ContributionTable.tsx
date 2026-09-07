import { board } from '@/data';
import type { Game } from '@/data/types';
import { marketSpread } from '@/lib/format';
import { leagueQbValue, matchupRows } from './breakdown';
import { ContributionRow } from './ContributionRow';
import s from './ContributionTable.module.css';

// The baseline the per-side quarterback split is measured against. Only the difference
// of the two ratings is identified, so the choice cancels out of the edge column.
const LEAGUE_QB_VALUE = leagueQbValue(board.games);

/** The prediction as a head-to-head. The edge column sums to the predicted margin. */
export function ContributionTable({ game }: { game: Game }) {
  const rows = matchupRows(game, LEAGUE_QB_VALUE);

  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th className={s.side} />
          <th className={s.head}>{game.awayTeam}</th>
          <th className={s.head}>{game.homeTeam}</th>
          <th className={s.edgeHead}>Edge</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <ContributionRow
            key={row.label}
            row={row}
            homeTeam={game.homeTeam}
            awayTeam={game.awayTeam}
          />
        ))}
        <tr>
          <td colSpan={3} className={s.totalLabel}>
            Predicted margin
          </td>
          <td className={s.totalValue}>{marketSpread(game.homeTeam, game.predMean)}</td>
        </tr>
      </tbody>
    </table>
  );
}
