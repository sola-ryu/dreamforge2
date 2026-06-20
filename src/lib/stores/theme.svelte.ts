import type { Theme } from '$lib/types';

export let theme = $state<Theme>('dark');

export function toggleTheme() {
  if (theme === 'dark') theme = 'light';
  else if (theme === 'light') theme = 'monochrome';
  else theme = 'dark';
}
