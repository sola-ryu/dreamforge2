import type { Theme } from '$lib/types';

let _theme = $state<Theme>('dark');

export function getTheme() {
  return _theme;
}

export function toggleTheme() {
  if (_theme === 'dark') _theme = 'light';
  else if (_theme === 'light') _theme = 'monochrome';
  else _theme = 'dark';
}
