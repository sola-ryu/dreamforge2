/** DOM actions backing the entity grid's spreadsheet behaviours. */

/**
 * Cap an overflowing cell's content at the right edge of the last empty column it may
 * spill into. Measured from the live layout, so column resizes stay accurate.
 */
export function spill(node: HTMLElement, count: number) {
  let columns = count;
  let frame = 0;

  function apply() {
    frame = 0;
    const cell = node.parentElement;
    if (!cell) return;
    if (columns < 1) {
      node.style.maxWidth = '';
      return;
    }
    const box = cell.getBoundingClientRect();
    let right = box.right;
    let sibling = cell.nextElementSibling;
    for (let i = 0; i < columns && sibling; i++) {
      right = sibling.getBoundingClientRect().right;
      sibling = sibling.nextElementSibling;
    }
    node.style.maxWidth = `${Math.max(box.width, right - box.left)}px`;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }

  schedule();
  const observer = new ResizeObserver(schedule);
  const table = node.closest('table');
  if (table) observer.observe(table);

  return {
    update(next: number) {
      columns = next;
      schedule();
    },
    destroy() {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    }
  };
}

/** Grow an inline editor past its cell so long values stay readable while editing. */
export function autoWidth(node: HTMLElement) {
  function apply() {
    const cell = node.closest('td');
    const min = cell ? cell.clientWidth : 0;
    if (node instanceof HTMLInputElement) {
      node.style.width = '0';
      node.style.width = `${Math.max(min, node.scrollWidth + 18)}px`;
    } else {
      node.style.minWidth = `${min}px`;
    }
  }

  apply();
  node.addEventListener('input', apply);
  return {
    destroy() {
      node.removeEventListener('input', apply);
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
