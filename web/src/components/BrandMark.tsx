import s from './BrandMark.module.css';

/* The only brand-level graphic the design system allows: a posterior curve with the
   market line through it. The site is deliberately untitled, so there is no wordmark. */
export function BrandMark() {
  return (
    <svg
      width={26}
      height={16}
      viewBox="0 0 26 16"
      role="img"
      aria-label="A posterior density with a market line through it"
      className={s.mark}
    >
      <path d="M0 15 C6 15 6.5 2 13 2 C19.5 2 20 15 26 15 L26 15 L0 15 Z" fill="var(--accent-quiet)" />
      <path d="M0 15 C6 15 6.5 2 13 2 C19.5 2 20 15 26 15" fill="none" stroke="var(--accent)" strokeWidth={1.5} />
      <line x1={17.5} y1={0} x2={17.5} y2={15} stroke="var(--chart-line)" strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  );
}
