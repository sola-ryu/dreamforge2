let _compact = $state(false);

export function getCompactMode() {
  return {
    get active() {
      return _compact;
    },
    toggle() {
      _compact = !_compact;
    }
  };
}
