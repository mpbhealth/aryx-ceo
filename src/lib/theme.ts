export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'aryx-theme';

export function getPreferredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.style.colorScheme = mode;
  const themeColor = mode === 'dark' ? '#0C0B0A' : '#F3EFE6';
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
    node.setAttribute('content', themeColor);
  });
  localStorage.setItem(THEME_KEY, mode);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getPreferredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function initTheme() {
  applyTheme(getPreferredTheme());
}
