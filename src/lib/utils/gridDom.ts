/** DOM actions backing the entity grid's spreadsheet behaviours. */

export interface SpillOptions {
  /** Number of following columns the cell may overflow into. */
  count: number;
  /** Sticky cells stay put while the columns they spill over scroll away beneath them. */
  sticky?: boolean;
}

/**
 * Cap an overflowing cell's content at the right edge of the last empty column it may
 * spill into. The measurement is scroll-independent; sticky cells then subtract the live
 * scroll offset in CSS, clipping the spill as the columns beneath them slide away.
 */
export function spill(node: HTMLElement, options: SpillOptions) {
  let current = options;
  let frame = 0;

  function apply() {
    frame = 0;
    const cell = node.parentElement;
    if (!cell) return;
    if (current.count < 1) {
      node.style.maxWidth = '';
      return;
    }
    // Summing widths rather than reading positions: a sticky cell's offsetLeft moves
    // with the scroll, its width does not.
    const own = cell.offsetWidth;
    let full = own;
    let sibling = cell.nextElementSibling as HTMLElement | null;
    for (let i = 0; i < current.count && sibling; i++) {
      full += sibling.offsetWidth;
      sibling = sibling.nextElementSibling as HTMLElement | null;
    }
    node.style.maxWidth = current.sticky
      ? `max(${own}px, calc(${full}px - var(--grid-scroll-x, 0px)))`
      : `${full}px`;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }

  schedule();
  const observer = new ResizeObserver(schedule);
  const table = node.closest('table');
  if (table) observer.observe(table);

  return {
    update(next: SpillOptions) {
      current = next;
      schedule();
    },
    destroy() {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    }
  };
}

/** Publish the grid's horizontal scroll offset for sticky cells to subtract. */
export function scrollTracker(node: HTMLElement) {
  let frame = 0;

  function apply() {
    frame = 0;
    node.style.setProperty('--grid-scroll-x', `${node.scrollLeft}px`);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }

  apply();
  node.addEventListener('scroll', schedule, { passive: true });
  return {
    destroy() {
      node.removeEventListener('scroll', schedule);
      if (frame) cancelAnimationFrame(frame);
    }
  };
}

/**
 * Grow an inline editor past its cell so long values stay readable while editing.
 * Takes the draft as a parameter so the editor is resized once the value it opens
 * with has landed, not just on later keystrokes.
 */
export function autoWidth(node: HTMLElement, _value?: unknown) {
  let frame = 0;

  function apply() {
    frame = 0;
    const cell = node.closest('td');
    const min = cell ? cell.clientWidth : 0;
    if (node instanceof HTMLInputElement) {
      node.style.width = '0';
      node.style.width = `${Math.max(min, node.scrollWidth + 18)}px`;
    } else {
      node.style.minWidth = `${min}px`;
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }

  apply();
  schedule();
  node.addEventListener('input', apply);
  return {
    update() {
      schedule();
    },
    destroy() {
      node.removeEventListener('input', apply);
      if (frame) cancelAnimationFrame(frame);
    }
  };
}

/** Publish the first column's width so the second can stick right beside it. */
export function stickyColumns(table: HTMLElement) {
  const head = table.querySelector<HTMLElement>('thead th');
  if (!head) return;

  function apply() {
    table.style.setProperty('--grid-col0', `${head!.offsetWidth}px`);
  }

  apply();
  const observer = new ResizeObserver(apply);
  observer.observe(head);
  return {
    destroy() {
      observer.disconnect();
    }
  };
}
