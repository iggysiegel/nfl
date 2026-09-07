import { BREAK_EVEN } from '@/config';
import type { ConfidenceBand } from '@/data/types';
import { precisePercent } from '@/lib/format';
import styles from './ConfidenceBandChart.module.css';

/* Cover rate by how strongly the model disagreed with the market.
   Bars grow from the break-even rule rather than from zero: the question is which
   side of break-even a band lands on, and a zero baseline would both flatten the
   differences and invite a truncated axis. */

const PLOT = { left: 52, right: 628, top: 30, bottom: 196 };
const STEP = 5; // percentage points between gridlines
const BAR_SHARE = 0.64; // of each band's column, leaving a gap between bars
// Clearance before snapping out to a gridline, so a bar never lands on the axis and
// push its value label into the band labels underneath.
const HEADROOM = 1;
// Below the axis: the band's name, then its game count.
const BAND_LABEL_Y = 214;
const COUNT_Y = 230;

function domain(bands: ConfidenceBand[]): [number, number] {
  const rates = bands
    .map((band) => band.coverRate)
    .filter((rate): rate is number => rate !== null)
    .map((rate) => rate * 100);
  const values = [...rates, BREAK_EVEN * 100];
  return [
    Math.floor((Math.min(...values) - HEADROOM) / STEP) * STEP,
    Math.ceil((Math.max(...values) + HEADROOM) / STEP) * STEP,
  ];
}

export function ConfidenceBandChart({ bands }: { bands: ConfidenceBand[] }) {
  const [low, high] = domain(bands);
  const y = (pct: number) =>
    PLOT.bottom - ((pct - low) / (high - low)) * (PLOT.bottom - PLOT.top);
  const breakEvenY = y(BREAK_EVEN * 100);
  const column = (PLOT.right - PLOT.left) / bands.length;

  const gridlines: number[] = [];
  for (let pct = low; pct <= high; pct += STEP) gridlines.push(pct);

  return (
    <svg
      viewBox="0 0 640 240"
      className={styles.chart}
      role="img"
      aria-label="Against-the-spread cover rate by model confidence band"
    >
      <line className={styles.axis} x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} />
      <line className={styles.baseline} x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} />

      {gridlines.map((pct) => (
        <g key={pct}>
          <line className={styles.axis} x1={PLOT.left} y1={y(pct)} x2={PLOT.right} y2={y(pct)} />
          <text className={styles.gridLabel} x={PLOT.left - 8} y={y(pct) + 4} textAnchor="end">
            {pct}%
          </text>
        </g>
      ))}

      <line className={styles.breakEven} x1={PLOT.left} y1={breakEvenY} x2={PLOT.right} y2={breakEvenY} />

      {bands.map((band, index) => {
        const centre = PLOT.left + index * column + column / 2;
        const startsBetting = band.bet && !bands[index - 1]?.bet;
        if (band.coverRate === null) {
          return (
            <text key={band.label} className={styles.bandLabel} x={centre} y={BAND_LABEL_Y} textAnchor="middle">
              {band.label}
            </text>
          );
        }
        const rate = band.coverRate * 100;
        const covers = rate >= BREAK_EVEN * 100;
        const top = Math.min(y(rate), breakEvenY);
        const height = Math.max(Math.abs(y(rate) - breakEvenY), 1);
        return (
          <g key={band.label}>
            <title>
              {`${band.label}: ${precisePercent(band.coverRate)} of ${band.games} games` +
                (band.bet ? ' (bet)' : ' (not bet)')}
            </title>
            {startsBetting && (
              <line
                className={styles.divider}
                x1={PLOT.left + index * column}
                y1={PLOT.top - 12}
                x2={PLOT.left + index * column}
                y2={PLOT.bottom + 34}
              />
            )}
            <rect
              x={centre - (column * BAR_SHARE) / 2}
              y={top}
              width={column * BAR_SHARE}
              height={height}
              className={covers ? styles.covers : styles.misses}
            />
            <text className={styles.rate} x={centre} y={covers ? top - 8 : top + height + 16} textAnchor="middle">
              {precisePercent(band.coverRate)}
            </text>
            <text className={styles.bandLabel} x={centre} y={BAND_LABEL_Y} textAnchor="middle">
              {band.label}
            </text>
            <text className={styles.count} x={centre} y={COUNT_Y} textAnchor="middle">
              {band.games} games
            </text>
            {band.bet && (
              <text className={styles.betFlag} x={centre} y={PLOT.top - 16} textAnchor="middle">
                bet
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
