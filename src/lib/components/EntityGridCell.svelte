<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import { cn } from '$lib/utils';
  import { getCellValue, toEditString, type GridColumn } from '$lib/utils/entityGrid';
  import { Maximize2 } from '@lucide/svelte';

  type Move = 'down' | 'right' | 'left' | 'none';

  let {
    entity,
    column,
    editing = false,
    editSeed = '',
    canEdit = false,
    refOptions = [],
    href,
    onCommit,
    onCancel,
    onOpenPanel
  }: {
    entity: Record<string, any>;
    column: GridColumn;
    editing?: boolean;
    /** Value the editor opens with — a typed character, or the current value. */
    editSeed?: string;
    canEdit?: boolean;
    refOptions?: { id: string; name: string }[];
    href?: string;
    onCommit: (raw: string, move: Move) => void;
    onCancel: () => void;
    onOpenPanel: () => void;
  } = $props();

  let value = $derived(getCellValue(entity, column.key));
  let display = $derived(toEditString(value));

  let draft = $state('');
  let editorEl = $state<HTMLElement | null>(null);
  /** Set once the edit is resolved by key, so the unmount blur doesn't commit a second time. */
  let resolved = $state(false);

  // Reseed whenever this cell (re)enters edit mode.
  $effect(() => {
    if (editing) {
      draft = editSeed;
      resolved = false;
    }
  });

  function commitOnBlur() {
    if (resolved) return;
    resolved = true;
    onCommit(draft, 'none');
  }

  $effect(() => {
    if (editing && editorEl) {
      editorEl.focus();
      if (editorEl instanceof HTMLInputElement) {
        // Seeded by a keystroke: keep the caret after it rather than selecting.
        const end = editorEl.value.length;
        editorEl.setSelectionRange(end, end);
      }
    }
  });

  function onEditorKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      resolved = true;
      onCommit(draft, 'down');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      resolved = true;
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      resolved = true;
      onCommit(draft, e.shiftKey ? 'left' : 'right');
    }
  }

  const inputClass =
    'w-full rounded-sm border border-primary bg-background px-1 py-0.5 text-sm focus:outline-none';

  let inputType = $derived(
    column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'
  );

  let listId = $derived(`grid-ref-${column.key}`);
</script>

{#if editing && column.key === 'status'}
  <select
    bind:this={editorEl}
    bind:value={draft}
    class={inputClass}
    onkeydown={onEditorKeydown}
    onblur={commitOnBlur}
  >
    <option value="draft">Draft</option>
    <option value="wip">In Progress</option>
    <option value="complete">Complete</option>
  </select>
{:else if editing && column.type === 'entityRef'}
  <!-- Free-text with suggestions: entity references are stored as plain names. -->
  <input
    bind:this={editorEl}
    type="text"
    list={listId}
    bind:value={draft}
    class={inputClass}
    onkeydown={onEditorKeydown}
    onblur={commitOnBlur}
  />
  <datalist id={listId}>
    {#each refOptions as opt (opt.id)}
      <option value={opt.name}></option>
    {/each}
  </datalist>
{:else if editing}
  <input
    bind:this={editorEl}
    type={inputType}
    bind:value={draft}
    placeholder={column.type === 'tags' ? 'tag1, tag2' : column.placeholder || ''}
    class={inputClass}
    onkeydown={onEditorKeydown}
    onblur={commitOnBlur}
  />
{:else if column.type === 'boolean'}
  <input
    type="checkbox"
    checked={value === true || value === 'true'}
    disabled={!canEdit}
    class="rounded border-input"
    onchange={(e) =>
      onCommit((e.currentTarget as HTMLInputElement).checked ? 'true' : 'false', 'none')}
  />
{:else if column.key === 'status'}
  <span
    class={cn(
      'text-xs',
      value === 'complete' && 'text-green-600 dark:text-green-400',
      value === 'wip' && 'text-yellow-600 dark:text-yellow-400',
      value === 'draft' && 'text-muted-foreground'
    )}
  >
    {value === 'complete' ? 'Complete' : value === 'wip' ? 'In Progress' : 'Draft'}
  </span>
{:else if column.key === 'name'}
  <a class="truncate font-medium hover:underline" {href} tabindex={-1}>{display}</a>
{:else if column.type === 'tags'}
  {#if Array.isArray(value) && value.length}
    <span class="flex items-center gap-1">
      {#each value.slice(0, 3) as tag}
        <Badge variant="secondary">{tag}</Badge>
      {/each}
      {#if value.length > 3}
        <span class="text-xs text-muted-foreground">+{value.length - 3}</span>
      {/if}
    </span>
  {:else}
    <span class="text-xs text-muted-foreground">—</span>
  {/if}
{:else if column.panelOnly}
  <span class="flex items-center gap-1">
    <span class="truncate text-sm text-muted-foreground">{display || '—'}</span>
    {#if canEdit}
      <button
        type="button"
        class="ml-auto shrink-0 opacity-0 group-hover/cell:opacity-100"
        onclick={onOpenPanel}
        tabindex={-1}
        aria-label="Edit {column.label}"
      >
        <Maximize2 class="h-3 w-3 text-muted-foreground" />
      </button>
    {/if}
  </span>
{:else}
  <span class="truncate text-sm text-muted-foreground">{display || '—'}</span>
{/if}
