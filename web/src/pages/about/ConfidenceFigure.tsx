import s from './ConfidenceFigure.module.css';

/* The worked example behind the confidence metric: one game's predictive distribution
   with the market spread drawn through it, and the mass below that spread shaded.
   Drawn rather than imported so it takes the page's colours and both themes.

   Only the marks live in the svg. Every label is HTML underneath it, because the svg
   scales with the column and scaled text stops being readable on a phone. */

const MEAN = 0;
const SD = 7;
const SPREAD = 7;
const DOMAIN = 20; // x runs from -DOMAIN to +DOMAIN
const TICK_STEP = 10;
const SAMPLES = 96;

const WIDTH = 560;
const PAD = 26; // room for the end tick labels, which sit outside the svg
const TOP = 20;
const BASELINE = 200;
const HEIGHT = 208;

const px = (x: number) => PAD + ((x + DOMAIN) / (2 * DOMAIN)) * (WIDTH - 2 * PAD);

export function ConfidenceFigure() {
  const py = (v: number) => BASELINE - v * (BASELINE - TOP);
  const density = (x: number) => Math.exp(-((x - MEAN) ** 2) / (2 * SD * SD));

  const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = -DOMAIN + (2 * DOMAIN * i) / SAMPLES;
    return `${px(x)},${py(density(x))}`;
  });

  // The shaded region stops at the spread: that area is what confidence measures.
  const below = curve.filter((_, i) => -DOMAIN + (2 * DOMAIN * i) / SAMPLES <= SPREAD);
  const mass = `M${px(-DOMAIN)},${BASELINE}L${below.join('L')}L${px(SPREAD)},${BASELINE}Z`;

  const ticks: number[] = [];
  for (let t = -DOMAIN; t <= DOMAIN; t += TICK_STEP) ticks.push(t);

  return (
    <div>
      <svg
        className={s.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="A predicted score differential distribution centred on zero, with the market spread drawn as a dashed line at plus seven and the probability mass below it shaded."
      >
        <path className={s.mass} d={mass} />
        <line className={s.baseline} x1={PAD} y1={BASELINE} x2={WIDTH - PAD} y2={BASELINE} />
        <polyline className={s.curve} points={curve.join(' ')} />
        <line className={s.spread} x1={px(SPREAD)} y1={TOP - 10} x2={px(SPREAD)} y2={BASELINE} />
        {ticks.map((t) => (
          <line
            key={t}
            className={s.baseline}
            x1={px(t)}
            y1={BASELINE}
            x2={px(t)}
            y2={BASELINE + 5}
          />
        ))}
      </svg>
      <div className={s.axis}>
        {ticks.map((t) => (
          <span key={t} className={s.tick} style={{ left: `${(100 * px(t)) / WIDTH}%` }}>
            {t > 0 ? `+${t}` : t}
          </span>
        ))}
      </div>
      <div className={s.caption}>Predicted Score Differential (Home − Away)</div>
      <div className={s.legend}>
        <span className={s.legendCurve}>— Predicted Distribution</span>
        <span className={s.legendSpread}>-- Spread</span>
      </div>
    </div>
  );
}
