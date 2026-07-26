import { browser } from '$app/environment';
import type { Theme } from '$lib/types';

const STORAGE_KEY = 'dreamforge:theme';

function initialTheme(): Theme {
  if (!browser) return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

let _theme = $state<Theme>(initialTheme());

export function getTheme() {
  return {
    get value() {
      return _theme;
    }
  };
}

export function toggleTheme() {
  _theme = _theme === 'dark' ? 'light' : 'dark';
  if (browser) localStorage.setItem(STORAGE_KEY, _theme);
}
