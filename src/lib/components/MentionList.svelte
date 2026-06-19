<script lang="ts">
  import { Check } from 'lucide-svelte';

  interface MentionItem {
    id: string;
    type: string;
    label: string;
    sublabel?: string;
  }

  let { items = [], selectedIndex = 0, onSelect }: {
    items: MentionItem[];
    selectedIndex: number;
    onSelect: (item: MentionItem) => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      onSelect(items[selectedIndex]);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if items.length > 0}
  <div class="absolute z-50 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
    {#each items as item, i}
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
        class:bg-accent={i === selectedIndex}
        class:text-accent-foreground={i === selectedIndex}
        onclick={() => onSelect(item)}
      >
        <span class="flex-1 truncate">{item.label}</span>
        <span class="text-xs text-muted-foreground">{item.sublabel || item.type}</span>
        {#if i === selectedIndex}
          <Check class="h-3 w-3" />
        {/if}
      </button>
    {/each}
  </div>
{/if}
