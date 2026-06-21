<script lang="ts">
  import { Popover, Command } from 'bits-ui';
  import { Button } from '$lib/components/ui/button';
  import { Check, ChevronsUpDown, Search } from '@lucide/svelte';
  import { cn } from '$lib/utils.js';

  let {
    options = [],
    value = $bindable(''),
    name,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    disabled = false,
    class: className,
    onSelect
  }: {
    options: { value: string; label: string }[];
    value?: string;
    name?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    class?: string;
    onSelect?: (value: string) => void;
  } = $props();

  let open = $state(false);
  let searchValue = $state('');

  let selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

  function handleSelect(val: string) {
    if (onSelect) {
      onSelect(val);
    } else {
      value = val;
    }
    open = false;
    searchValue = '';
  }
</script>

{#if name}
  <input type="hidden" {name} {value} />
{/if}

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class={cn(
          'w-full justify-between font-normal',
          !value && 'text-muted-foreground',
          className
        )}
        {disabled}
        {...props}
      >
        {selectedLabel || placeholder}
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content
    class="z-50 min-w-[8rem] overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-[var(--bits-popover-anchor-width)]"
    align="start"
    sideOffset={4}
  >
    <Command.Root
      class="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground"
    >
      <div class="flex items-center border-b border-border px-3">
        <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <Command.Input
          bind:value={searchValue}
          placeholder={searchPlaceholder}
          class="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Command.List class="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
        <Command.Empty class="py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </Command.Empty>
        <Command.Group>
          {#each options as option}
            <Command.Item
              value={option.value}
              onSelect={() => handleSelect(option.value)}
              class="relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none data-[selected]:bg-accent data-[selected]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <Check
                class={cn('h-4 w-4 shrink-0', value === option.value ? 'opacity-100' : 'opacity-0')}
              />
              {option.label}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
