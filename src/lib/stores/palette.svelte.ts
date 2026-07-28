import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = Symbol('palette');

export interface PaletteState {
  open: boolean;
  toggle(): void;
}

// A module-level $state would be a singleton shared by every concurrent SSR
// request on the server. Each render tree gets its own instance via context
// instead, matching theme.svelte.ts and zenMode.svelte.ts.
export function createPaletteState(): PaletteState {
  let open = $state(false);

  return {
    get open() {
      return open;
    },
    set open(v: boolean) {
      open = v;
    },
    toggle() {
      open = !open;
    }
  };
}

export function providePalette(): PaletteState {
  const state = createPaletteState();
  setContext(CONTEXT_KEY, state);
  return state;
}

export function getPalette(): PaletteState {
  const state = getContext<PaletteState | undefined>(CONTEXT_KEY);
  if (!state) {
    throw new Error('getPalette() called outside of a component tree with providePalette()');
  }
  return state;
}
