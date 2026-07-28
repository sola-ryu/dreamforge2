import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = Symbol('overlays');

export interface ToggleState {
  open: boolean;
  toggle(): void;
}

export interface OverlayState {
  /** Ctrl/Cmd+K quick switcher. */
  palette: ToggleState;
  /** The "?" keyboard shortcut cheatsheet. */
  shortcuts: ToggleState;
}

function createToggle(): ToggleState {
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

// A module-level $state would be a singleton shared by every concurrent SSR
// request on the server. Each render tree gets its own instance via context
// instead, matching theme.svelte.ts and zenMode.svelte.ts.
export function createOverlayState(): OverlayState {
  return { palette: createToggle(), shortcuts: createToggle() };
}

export function provideOverlays(): OverlayState {
  const state = createOverlayState();
  setContext(CONTEXT_KEY, state);
  return state;
}

export function getOverlays(): OverlayState {
  const state = getContext<OverlayState | undefined>(CONTEXT_KEY);
  if (!state) {
    throw new Error('getOverlays() called outside of a component tree with provideOverlays()');
  }
  return state;
}
