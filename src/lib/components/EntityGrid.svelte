<script lang="ts">
  import { tick } from 'svelte';
  import EntityGridCell from '$lib/components/EntityGridCell.svelte';
  import EntityGridPanel from '$lib/components/EntityGridPanel.svelte';
  import { getCellValue, toEditString, layoutRow, type GridColumn } from '$lib/utils/entityGrid';
  import { spill, stickyColumns } from '$lib/utils/gridDom';
  import { cn, formatDate } from '$lib/utils';

  let {
    rows,
    entities,
    columns,
    projectId,
    route,
    canEdit = false,
    refEntities = {},
    emptyMessage = 'Nothing here yet.',
    entityHref,
    onSaved
  }: {
    /** Rows currently visible (search-filtered). */
    rows: Record<string, any>[];
    /** Every loaded entity — panel lookups and @-mention autocomplete. */
    entities: Record<string, any>[];
    columns: GridColumn[];
    projectId: string;
    route: string;
    canEdit?: boolean;
    refEntities?: Record<string, { id: string; name: string }[]>;
    emptyMessage?: string;
    entityHref: (entity: Record<string, any>) => string;
    onSaved: (entityId: string, column: GridColumn, raw: string) => void;
  } = $props();

  // `activeCell` is the spreadsheet cursor, `editing` means an inline editor is open.
  let activeCell = $state<{ row: number; col: number } | null>(null);
  let editing = $state(false);
  let editSeed = $state('');
  let panelTarget = $state<{ entityId: string; colIndex: number } | null>(null);
  let gridEl = $state<HTMLElement | null>(null);
  let gridError = $state('');

  let panelEntity = $derived(
    panelTarget ? entities.find((e) => e.id === panelTarget!.entityId) : null
  );

  /** Persist one cell to the server, then let the page patch the row optimistically. */
  async function saveCell(entityId: string, column: GridColumn, raw: string) {
    const current = toEditString(
      getCellValue(entities.find((e) => e.id === entityId) || {}, column.key)
    );
    if (current === raw) return;

    const body = new FormData();
    body.set('entityId', entityId);
    body.set('field', column.key);
    body.set('value', raw);

    const res = await fetch(`/projects/${projectId}/${route}?/quickUpdate`, {
      method: 'POST',
      body
    });

    if (res.ok) {
      onSaved(entityId, column, raw);
    } else {
      gridError = `Could not save ${column.label}.`;
      setTimeout(() => (gridError = ''), 4000);
    }
  }

  function moveActive(dRow: number, dCol: number) {
    if (!activeCell) return;
    const row = Math.min(Math.max(activeCell.row + dRow, 0), rows.length - 1);
    const col = Math.min(Math.max(activeCell.col + dCol, 0), columns.length - 1);
    activeCell = { row, col };
  }

  function beginEdit(seed: string) {
    if (!canEdit || !activeCell) return;
    const column = columns[activeCell.col];
    if (column.panelOnly) {
      openPanel(activeCell.row, activeCell.col);
      return;
    }
    if (column.type === 'boolean') return;
    editSeed = seed;
    editing = true;
  }

  function openPanel(row: number, col: number) {
    if (!canEdit) return;
    const entity = rows[row];
    if (!entity) return;
    editing = false;
    panelTarget = { entityId: entity.id, colIndex: col };
  }

  function closePanel() {
    panelTarget = null;
    focusActiveCell();
  }

  function onCellCommit(raw: string, move: 'down' | 'right' | 'left' | 'none') {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const entity = rows[row];
    const column = columns[col];
    editing = false;
    if (entity && column) saveCell(entity.id, column, raw);

    if (move === 'down') moveActive(1, 0);
    else if (move === 'right') moveActive(0, 1);
    else if (move === 'left') moveActive(0, -1);
    focusActiveCell();
  }

  function focusActiveCell() {
    tick().then(() => {
      if (editing || !activeCell || !gridEl) return;
      const el = gridEl.querySelector<HTMLElement>(
        `[data-cell="${activeCell.row}-${activeCell.col}"]`
      );
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function onGridKeydown(e: KeyboardEvent) {
    if (!activeCell || editing || panelTarget) return;
    const column = columns[activeCell.col];
    const entity = rows[activeCell.row];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveActive(0, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveActive(0, -1);
        break;
      case 'Tab':
        e.preventDefault();
        moveActive(0, e.shiftKey ? -1 : 1);
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        beginEdit(toEditString(getCellValue(entity, column.key)));
        break;
      case 'Escape':
        activeCell = null;
        return;
      case ' ':
        if (canEdit && column.type === 'boolean') {
          e.preventDefault();
          const on = getCellValue(entity, column.key) === true;
          saveCell(entity.id, column, on ? 'false' : 'true');
        }
        return;
      case 'Delete':
      case 'Backspace':
        if (canEdit && !column.panelOnly && column.key !== 'name') {
          e.preventDefault();
          saveCell(entity.id, column, column.type === 'boolean' ? 'false' : '');
        }
        return;
      default:
        // A bare printable character starts editing, seeded with what was typed.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          beginEdit(e.key);
        }
        return;
    }
    focusActiveCell();
  }

  // Keep the cursor in bounds when the filtered row set shrinks.
  $effect(() => {
    if (activeCell && activeCell.row >= rows.length) {
      activeCell = rows.length ? { ...activeCell, row: rows.length - 1 } : null;
    }
  });
</script>

<p class="mb-2 text-xs text-muted-foreground">
  Click a cell, then use arrow keys to move. Type or press Enter to edit, Enter/Tab to commit,
  Escape to cancel, Space to toggle checkboxes, Delete to clear.
</p>
<div class="rounded-lg border border-border overflow-x-auto" bind:this={gridEl}>
  {#if rows.length === 0}
    <p class="py-12 text-center text-muted-foreground">{emptyMessage}</p>
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <table
      class="w-full text-sm min-w-max border-separate border-spacing-0"
      use:stickyColumns
      onkeydown={onGridKeydown}
    >
      <thead class="sticky top-0 z-20 bg-background">
        <tr class="bg-muted/40">
          {#each columns as column, col}
            <th
              class={cn(
                'border-b border-border px-2 py-1.5 text-left font-medium whitespace-nowrap bg-muted/40',
                col <= 1 && 'sticky z-10',
                col === 1 && 'min-w-48'
              )}
              style={col === 0 ? 'left: 0' : col === 1 ? 'left: var(--grid-col0, 4rem)' : undefined}
            >
              {column.label}
            </th>
          {/each}
          <th
            class="border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground bg-muted/40"
          >
            Modified
          </th>
        </tr>
      </thead>
      <tbody>
        {#each rows as entity, row (entity.id)}
          {@const cells = layoutRow(entity, columns)}
          <tr class="group/row hover:bg-muted/20">
            {#each columns as column, col (column.key)}
              {@const isActive = activeCell?.row === row && activeCell?.col === col}
              {@const isEditing = isActive && editing}
              {@const spillCount = isEditing ? 0 : cells[col].spill}
              <td
                role="gridcell"
                tabindex={-1}
                data-cell="{row}-{col}"
                class={cn(
                  'group/cell h-9 border-b border-border p-0 align-middle focus:outline-none',
                  col === 0 ? 'w-10' : 'max-w-56',
                  col === 1 && 'min-w-48',
                  isEditing || spillCount > 0 ? 'overflow-visible' : 'overflow-hidden',
                  col <= 1 ? 'sticky z-10 bg-background group-hover/row:bg-muted/20' : 'relative',
                  isActive && !isEditing && 'ring-2 ring-inset ring-primary'
                )}
                style={col === 0
                  ? 'left: 0'
                  : col === 1
                    ? 'left: var(--grid-col0, 4rem)'
                    : undefined}
                onclick={() => (activeCell = { row, col })}
                ondblclick={() => beginEdit(toEditString(getCellValue(entity, column.key)))}
              >
                <div
                  class={cn(
                    'flex h-full items-center gap-1 overflow-hidden whitespace-nowrap px-2',
                    (isEditing || spillCount > 0) && 'absolute inset-y-0 left-0 w-max',
                    isEditing && 'z-30 overflow-visible px-0'
                  )}
                  use:spill={spillCount}
                >
                  <EntityGridCell
                    {entity}
                    {column}
                    {canEdit}
                    editing={isEditing}
                    {editSeed}
                    covered={cells[col].covered}
                    refOptions={refEntities[column.entityType || ''] || []}
                    href={entityHref(entity)}
                    onCommit={onCellCommit}
                    onCancel={() => {
                      editing = false;
                      focusActiveCell();
                    }}
                    onOpenPanel={() => openPanel(row, col)}
                  />
                </div>
              </td>
            {/each}
            <td
              class="border-b border-border px-2 py-1 text-xs text-muted-foreground whitespace-nowrap"
            >
              {formatDate(entity.modifiedAt)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if panelTarget && panelEntity}
  {#key panelTarget.entityId + ':' + panelTarget.colIndex}
    <EntityGridPanel
      entity={panelEntity}
      column={columns[panelTarget.colIndex]}
      entities={entities as { id: string; type: string; name: string; status?: string }[]}
      onSave={(raw) => {
        saveCell(panelTarget!.entityId, columns[panelTarget!.colIndex], raw);
        closePanel();
      }}
      onClose={closePanel}
    />
  {/key}
{/if}

{#if gridError}
  <div
    class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-destructive/40 bg-card px-4 py-2 text-sm text-destructive shadow-lg"
  >
    {gridError}
  </div>
{/if}
