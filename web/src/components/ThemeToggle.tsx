import { Moon, Sun } from 'lucide-react';
import type { Theme } from '@/hooks/useTheme';
import s from './ThemeToggle.module.css';

/** Sun and moon are the only icons on the site, so they are imported directly rather
 *  than through a name-keyed wrapper that would pull in the whole Lucide set. */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const Glyph = theme === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={onToggle}
      className={s.toggle}
    >
      <Glyph size={16} strokeWidth={1.75} aria-hidden className={s.glyph} />
    </button>
  );
}
