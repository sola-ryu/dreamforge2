import { writable } from 'svelte/store';
import type { Theme } from '$lib/types';

export const theme = writable<Theme>('dark');

export function toggleTheme() {
  theme.update((current) => {
    if (current === 'dark') return 'light';
    if (current === 'light') return 'monochrome';
    return 'dark';
  });
}
