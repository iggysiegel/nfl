import { Moon, Sun } from 'lucide-react';
import type { Theme } from '@/hooks/useTheme';

/** Icons are imported one by one rather than through a name-keyed wrapper that would
 *  pull in the whole Lucide set. */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const Glyph = theme === 'dark' ? Sun : Moon;
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={onToggle}
      className="icon-button"
    >
      <Glyph size={16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
