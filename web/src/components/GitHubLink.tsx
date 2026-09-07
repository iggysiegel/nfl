import { REPO_URL } from '@/config';
import s from './GitHubLink.module.css';

/* Lucide dropped its brand glyphs, so the GitHub mark is inline. The design system's
   "never hand-draw an icon" rule is about UI glyphs, not third-party brand marks. */
export function GitHubLink() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="GitHub repository"
      title="GitHub repository"
      className={s.link}
    >
      <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden className={s.mark}>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.92-.88-2.92-2.75 0-.83.3-1.51.79-2.04-.08-.2-.35-1 .08-2.08 0 0 .66-.21 2.16.79a5.9 5.9 0 0 1 1.59-.21c.54 0 1.08.07 1.59.21 1.5-1.01 2.16-.79 2.16-.79.43 1.08.16 1.88.08 2.08.49.53.79 1.21.79 2.04 0 1.88-1.14 2.55-2.93 2.75.31.27.58.79.58 1.6 0 1.15-.01 2.08-.01 2.37 0 .21.15.46.55.38A7.99 7.99 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    </a>
  );
}
