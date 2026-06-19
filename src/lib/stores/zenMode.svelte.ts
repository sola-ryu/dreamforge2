let active = $state(false);
let backgroundImage = $state<string | null>(null);

export function getZenMode() {
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
