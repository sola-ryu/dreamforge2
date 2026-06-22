<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { tick } from "svelte";
  import type { Snippet } from "svelte";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";

  type Option = { value: string; label: string; group?: string };

  let {
    options = [],
    value = $bindable(''),
    name,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    disabled = false,
    class: className,
    onSelect,
    children,
  }: {
    options: Option[];
    value?: string;
    name?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    class?: string;
    onSelect?: (value: string) => void;
    children?: Snippet<[{ option: any; selected: boolean }]>;
  } = $props();

  let open = $state(false);
  let triggerRef = $state<HTMLButtonElement>(null!);

  let selectedOption = $derived(options.find((o) => o.value === value));

  let hasGroups = $derived(options.some((o) => o.group != null));

  let groups = $derived.by(() => {
    if (!hasGroups) return null;
    const map: Record<string, { heading: string | null; items: Option[] }> = {};
    const order: string[] = [];
    for (const opt of options) {
      const key = opt.group ?? '';
      if (!map[key]) {
        map[key] = { heading: opt.group ?? null, items: [] };
        order.push(key);
      }
      map[key].items.push(opt);
    }
    return order.map((key) => map[key]);
  });

  function closeAndFocusTrigger() {
    open = false;
    tick().then(() => {
      triggerRef.focus();
    });
  }

  function handleSelect(val: string) {
    if (onSelect) {
      onSelect(val);
    } else {
      value = val;
    }
    closeAndFocusTrigger();
  }
</script>

{#if name}
  <input type="hidden" {name} {value} />
{/if}

<Popover.Root bind:open>
  <Popover.Trigger bind:ref={triggerRef}>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class={cn(
          'w-full justify-between font-normal',
          !value && 'text-muted-foreground',
          className
        )}
        {disabled}
      >
        {#if children && selectedOption}
          {@render children({ option: selectedOption, selected: true })}
        {:else}
          {selectedOption?.label || placeholder}
        {/if}
        <ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="p-0" align="start" sideOffset={4}>
    <Command.Root>
      <Command.Input placeholder={searchPlaceholder} />
      <Command.List>
        <Command.Empty>{emptyText}</Command.Empty>
        {#if groups}
          {#each groups as group (group.heading ?? '')}
            <Command.Group heading={group.heading ?? undefined}>
              {#each group.items as option (option.value)}
                <Command.Item
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <CheckIcon
                    class={cn('h-4 w-4 shrink-0', value !== option.value && 'text-transparent')}
                  />
                  {#if children}
                    {@render children({ option, selected: value === option.value })}
                  {:else}
                    {option.label}
                  {/if}
                </Command.Item>
              {/each}
            </Command.Group>
          {/each}
        {:else}
          <Command.Group value="options">
            {#each options as option (option.value)}
              <Command.Item
                value={option.label}
                onSelect={() => handleSelect(option.value)}
              >
                <CheckIcon
                  class={cn('h-4 w-4 shrink-0', value !== option.value && 'text-transparent')}
                />
                {#if children}
                  {@render children({ option, selected: value === option.value })}
                {:else}
                  {option.label}
                {/if}
              </Command.Item>
            {/each}
          </Command.Group>
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
