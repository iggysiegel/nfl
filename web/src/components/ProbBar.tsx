import s from './ProbBar.module.css';

export type ProbBarTone = 'accent' | 'neutral';

interface ProbBarProps {
  /** A percentage, 0 to 100. */
  value: number;
  tone?: ProbBarTone;
  className?: string;
}

/** A bar with a centre tick, so a value's distance from even is readable at a glance. */
export function ProbBar({ value, tone = 'accent', className }: ProbBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className={`${s.track} ${className ?? ''}`}>
      <span className={`${s.fill} ${s[tone]}`} style={{ width: `${pct}%` }} />
      <span className={s.tick} />
    </span>
  );
}
