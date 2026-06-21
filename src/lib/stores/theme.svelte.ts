import type { Theme } from '$lib/types';

let _theme = $state<Theme>('dark');

export function getTheme() {
  return {
    get value() {
      return _theme;
    }
  };
}

export function toggleTheme() {
  _theme = _theme === 'dark' ? 'light' : 'dark';
}
