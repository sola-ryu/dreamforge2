<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { Button } from '$lib/components/ui/button';
  import { Columns3 } from '@lucide/svelte';
  import { LOCKED_COLUMNS, type GridColumn } from '$lib/utils/entityGrid';

  let {
    columns,
    visible,
    customized = false,
    onChange,
    onReset
  }: {
    columns: GridColumn[];
    visible: Set<string>;
    customized?: boolean;
    onChange: (keys: string[]) => void;
    onReset: () => void;
  } = $props();

  let choices = $derived(columns.filter((c) => !LOCKED_COLUMNS.includes(c.key)));
  let hiddenCount = $derived(choices.filter((c) => !visible.has(c.key)).length);

  function toggle(key: string, on: boolean) {
    const next = new Set(visible);
    if (on) next.add(key);
    else next.delete(key);
    onChange(columns.map((c) => c.key).filter((k) => next.has(k)));
  }
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline" size="sm">
        <Columns3 class="h-4 w-4" />
        Columns
        {#if hiddenCount > 0}
          <span class="text-xs text-muted-foreground">({hiddenCount} hidden)</span>
        {/if}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="max-h-96 w-64 overflow-y-auto p-2" align="end">
    <p class="px-2 pb-1 text-xs text-muted-foreground">
      Show the fields you are filling in. Name and status always stay.
    </p>
    {#each choices as column (column.key)}
      <label
        class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary"
      >
        <input
          type="checkbox"
          class="rounded border-input"
          checked={visible.has(column.key)}
          onchange={(e) => toggle(column.key, e.currentTarget.checked)}
        />
        {column.label}
      </label>
    {/each}
    {#if customized}
      <Button variant="ghost" size="xs" class="mt-1 w-full" onclick={onReset}>
        Reset to filled-in columns
      </Button>
    {/if}
  </Popover.Content>
</Popover.Root>
