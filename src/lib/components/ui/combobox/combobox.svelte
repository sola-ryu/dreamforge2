<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import { tick } from "svelte";
  import * as Command from "$lib/components/ui/command";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";

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
  let triggerRef = $state<HTMLButtonElement>(null!);

  let selectedValue = $derived(options.find((o) => o.value === value)?.label ?? '');

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
        {selectedValue || placeholder}
        <ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="p-0" align="start" sideOffset={4}>
    <Command.Root>
      <Command.Input placeholder={searchPlaceholder} />
      <Command.List>
        <Command.Empty>{emptyText}</Command.Empty>
        <Command.Group value="options">
          {#each options as option (option.value)}
            <Command.Item
              value={option.label}
              onSelect={() => handleSelect(option.value)}
            >
              <CheckIcon
                class={cn('h-4 w-4 shrink-0', value !== option.value && 'text-transparent')}
              />
              {option.label}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
