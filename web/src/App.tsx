import { useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { GitHubLink } from '@/components/GitHubLink';
import { TopNav } from '@/components/TopNav';
import { useTheme } from '@/hooks/useTheme';
import { AboutPage } from '@/pages/about/AboutPage';
import { BoardPage } from '@/pages/board/BoardPage';
import s from './App.module.css';

type View = 'slate' | 'notes';

const NAV_ITEMS = [
  { value: 'slate', label: 'Games' },
  { value: 'notes', label: 'About' },
] as const satisfies readonly { value: View; label: string }[];

/** The nav and the two pages. Each page owns everything inside it. */
export function App() {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<View>('slate');

  return (
    <div className={s.app}>
      <TopNav
        brand={<BrandMark />}
        items={NAV_ITEMS}
        value={view}
        onChange={setView}
        right={<GitHubLink />}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {view === 'slate' ? <BoardPage /> : <AboutPage />}
    </div>
  );
}
