import type { ReactNode } from 'react';
import s from './StatBlock.module.css';

export function StatBlock({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className={s.block}>
      <span className="label">{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  );
}
