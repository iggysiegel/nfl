import { useState } from 'react';

export type Theme = 'light' | 'dark';

/** Theme state, kept on `<html data-theme>` where the token swap can see it.
 *
 * The attribute is set by an inline script in index.html before the first paint, so
 * this hook reads the value already there rather than deciding it again — deciding it
 * here would mean a frame of the wrong theme.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? 'light',
  );

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private browsing can refuse storage; the toggle still works for this visit.
    }
    setTheme(next);
  };

  return { theme, toggleTheme };
}
