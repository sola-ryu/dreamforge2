import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = Symbol('zenMode');

export interface ZenModeState {
  active: boolean;
  backgroundImage: string | null;
  toggle(): void;
}

// A module-level $state would be a singleton shared by every concurrent SSR
// request on the server, letting one user's zen-mode toggle leak into another's
// rendered HTML. Each render tree gets its own instance via context instead.
export function createZenModeState(): ZenModeState {
  let active = $state(false);
  let backgroundImage = $state<string | null>(null);

  return {
    get active() {
      return active;
    },
    set active(v: boolean) {
      active = v;
    },
    get backgroundImage() {
      return backgroundImage;
    },
    set backgroundImage(v: string | null) {
      backgroundImage = v;
    },
    toggle() {
      active = !active;
    }
  };
}

export function provideZenMode(): ZenModeState {
  const state = createZenModeState();
  setContext(CONTEXT_KEY, state);
  return state;
}

export function getZenMode(): ZenModeState {
  const state = getContext<ZenModeState | undefined>(CONTEXT_KEY);
  if (!state) {
    throw new Error('getZenMode() called outside of a component tree with provideZenMode()');
  }
  return state;
}
