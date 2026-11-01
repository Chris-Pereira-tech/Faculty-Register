import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function getEffectiveTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return 'dark';
  if (attr === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem('color-scheme', theme);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', theme);
    document.documentElement.setAttribute('data-theme', theme);
    window.dispatchEvent(new Event('theme-change'));
  } catch (_) {}
}

export function toggleTheme(): Theme {
  const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function useTheme(): [Theme, () => void] {
  const [theme, setLocalTheme] = useState<Theme>(getEffectiveTheme);

  useEffect(() => {
    function handleUpdate() {
      setLocalTheme(getEffectiveTheme());
    }

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('theme-change', handleUpdate);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('theme-change', handleUpdate);
      mql.removeEventListener('change', handleUpdate);
    };
  }, []);

  return [theme, toggleTheme];
}
