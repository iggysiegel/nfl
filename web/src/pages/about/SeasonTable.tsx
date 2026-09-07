import type { AtsRecord, History, Totals } from '@/data/types';
import { coverRate } from '@/lib/ats';
import { DASH, precisePercent, recordLabel, signed } from '@/lib/format';
import s from './SeasonTable.module.css';

const COLUMNS = ['ATS, closing', 'ATS, opening', 'CLV', 'Model MAE', 'Market MAE'];

function record(value: AtsRecord) {
  const rate = coverRate(value);
  return (
    <>
      {recordLabel(value.wins, value.losses)}{' '}
      <span className={s.rate}>{rate === null ? DASH : precisePercent(rate)}</span>
    </>
  );
}

function cells(totals: Totals) {
  return [
    record(totals.atsClosing),
    record(totals.atsOpening),
    totals.clv === null ? DASH : signed(totals.clv),
    totals.modelMae === null ? DASH : totals.modelMae.toFixed(1),
    totals.marketMae === null ? DASH : totals.marketMae.toFixed(1),
  ];
}

export function SeasonTable({ seasons, allTime }: Pick<History, 'seasons' | 'allTime'>) {
  return (
    <div className={s.card}>
      <div className="scroll">
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.season}>Season</th>
              {COLUMNS.map((column) => (
                <th key={column} className={s.head}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <tr key={season.season}>
                <td className={s.year}>{season.season}</td>
                {cells(season).map((cell, index) => (
                  <td key={COLUMNS[index]} className={s.cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className={s.totalLabel}>All time</td>
              {cells(allTime).map((cell, index) => (
                <td key={COLUMNS[index]} className={s.total}>
                  {cell}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
