import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import s from './TopNav.module.css';

export interface NavItem<T extends string> {
  value: T;
  label: string;
}

interface TopNavProps<T extends string> {
  brand?: ReactNode;
  items: readonly NavItem<T>[];
  value: T;
  onChange: (value: T) => void;
  right?: ReactNode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function TopNav<T extends string>({
  brand,
  items,
  value,
  onChange,
  right,
  theme,
  onToggleTheme,
}: TopNavProps<T>) {
  return (
    <header className={s.bar}>
      <div className={s.inner}>
        {brand && <span className={s.brand}>{brand}</span>}
        <nav className={s.items}>
          {items.map((item) => {
            const on = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(item.value)}
                className={`${s.item} ${on ? s.on : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        {right}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
