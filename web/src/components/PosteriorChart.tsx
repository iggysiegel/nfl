import s from './PosteriorChart.module.css';

/* Posterior density over the margin: normal curve, market line, model mean.
   The predictive draws in predict_week are normal by construction, so the curve is
   drawn from the mean and standard deviation rather than the quantile grid. */

const SPAN_SD = 3.2; // half-width of the x range, in standard deviations
const SAMPLES = 96;
const TICK_STEP = 10; // points of margin between x-axis ticks

interface PosteriorChartProps {
  mean: number;
  sd: number;
  /** Market line in the same (display) convention as `mean`; null when none is posted. */
  marketLine?: number | null;
  modelLabel: string;
  marketLabel?: string;
  width?: number;
  height?: number;
}

export function PosteriorChart({
  mean,
  sd,
  marketLine = null,
  modelLabel,
  marketLabel,
  width = 560,
  height = 160,
}: PosteriorChartProps) {
  const lo = mean - SPAN_SD * sd;
  const hi = mean + SPAN_SD * sd;
  const density = (x: number) => Math.exp(-((x - mean) ** 2) / (2 * sd * sd));
  const px = (x: number) => ((x - lo) / (hi - lo)) * width;
  const py = (v: number) => height - 8 - v * (height - 28);

  const points = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / SAMPLES;
    return `${px(x)},${py(density(x))}`;
  });
  const area = `M${px(lo)},${height - 8}L${points.join('L')}L${px(hi)},${height - 8}Z`;

  const ticks: number[] = [];
  for (let t = Math.ceil(lo / TICK_STEP) * TICK_STEP; t <= hi; t += TICK_STEP) ticks.push(t);

  const label =
    marketLine === null
      ? `Posterior margin distribution, mean ${mean.toFixed(1)}, no market line`
      : `Posterior margin distribution, mean ${mean.toFixed(1)}, market line ${marketLine.toFixed(1)}`;

  return (
    <div>
      <svg className={s.chart} viewBox={`0 0 ${width} ${height + 14}`} role="img" aria-label={label}>
        <line x1="0" y1={height - 8} x2={width} y2={height - 8} stroke="var(--chart-grid)" strokeWidth="1" />
        <path d={area} fill="var(--accent-quiet)" />
        <polyline points={points.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1.75" />
        {marketLine !== null && (
          <line
            x1={px(marketLine)}
            y1="6"
            x2={px(marketLine)}
            y2={height - 8}
            stroke="var(--chart-line)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        <line x1={px(mean)} y1="6" x2={px(mean)} y2={height - 8} stroke="var(--accent)" strokeWidth="1.5" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={height - 8} x2={px(t)} y2={height - 4} stroke="var(--chart-grid)" strokeWidth="1" />
            <text className={s.tick} x={px(t)} y={height + 8} textAnchor="middle">
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}
      </svg>
      <div className={s.legend}>
        <span className={s.model}>— model {modelLabel}</span>
        {marketLine !== null && <span>-- market {marketLabel}</span>}
      </div>
    </div>
  );
}
