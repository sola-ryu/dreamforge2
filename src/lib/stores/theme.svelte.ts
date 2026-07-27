import { getContext, setContext } from 'svelte';
import { browser } from '$app/environment';
import type { Theme } from '$lib/types';

const STORAGE_KEY = 'dreamforge:theme';
const CONTEXT_KEY = Symbol('theme');

function initialTheme(): Theme {
  if (!browser) return 'dark';
  return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export interface ThemeState {
  readonly value: Theme;
  toggle(): void;
}

// A module-level $state would be a singleton shared by every concurrent SSR
// request on the server, letting one user's theme leak into another's rendered
// HTML. Each render tree gets its own instance via context instead.
export function createThemeState(): ThemeState {
  let _theme = $state<Theme>(initialTheme());

  return {
    get value() {
      return _theme;
    },
    toggle() {
      _theme = _theme === 'dark' ? 'light' : 'dark';
      if (browser) localStorage.setItem(STORAGE_KEY, _theme);
    }
  };
}

export function provideTheme(): ThemeState {
  const state = createThemeState();
  setContext(CONTEXT_KEY, state);
  return state;
}

export function getTheme(): ThemeState {
  const state = getContext<ThemeState | undefined>(CONTEXT_KEY);
  if (!state) throw new Error('getTheme() called outside of a component tree with provideTheme()');
  return state;
}
