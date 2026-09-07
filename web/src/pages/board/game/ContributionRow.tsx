import { DASH, edgeLabel, signed } from '@/lib/format';
import type { MatchupRow } from './breakdown';
import s from './ContributionRow.module.css';

interface ContributionRowProps {
  row: MatchupRow;
  homeTeam: string;
  awayTeam: string;
}

export function ContributionRow({ row, homeTeam, awayTeam }: ContributionRowProps) {
  return (
    <tr>
      <td className={s.label}>
        {row.label}
        {row.note && <span className={s.note}>{row.note}</span>}
      </td>
      <td className={s.numeric}>{row.away === null ? DASH : signed(row.away)}</td>
      <td className={s.numeric}>{row.home === null ? DASH : signed(row.home)}</td>
      <td className={s.edge}>{edgeLabel(row.edge, homeTeam, awayTeam)}</td>
    </tr>
  );
}
