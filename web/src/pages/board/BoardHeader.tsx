import { StatBlock } from '@/components/StatBlock';
import type { AtsRecord } from '@/data/types';
import { DASH, recordLabel, updatedLabel } from '@/lib/format';
import { weekLabel } from '@/lib/weekLabel';
import s from './BoardHeader.module.css';

interface BoardHeaderProps {
  season: number;
  week: number;
  generatedAt: string;
  seasonAts: { closing: AtsRecord; opening: AtsRecord };
}

/** A record reads as a dash until the season has decided something. */
function atsValue(record: AtsRecord): string {
  return record.wins + record.losses === 0 ? DASH : recordLabel(record.wins, record.losses);
}

export function BoardHeader({ season, week, generatedAt, seasonAts }: BoardHeaderProps) {
  return (
    <>
      <div className={s.title}>
        <h1 className={s.week}>{weekLabel(season, week)}</h1>
        <span className={s.updated}>updated {updatedLabel(generatedAt)}</span>
      </div>
      <div className={s.stats}>
        <StatBlock label="Season ATS, closing" value={atsValue(seasonAts.closing)} />
        <StatBlock label="Season ATS, opening" value={atsValue(seasonAts.opening)} />
      </div>
    </>
  );
}
