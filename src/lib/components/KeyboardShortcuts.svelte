<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Keyboard } from '@lucide/svelte';
  import { getOverlays } from '$lib/stores/overlays.svelte';

  const shortcuts = getOverlays().shortcuts;

  const SECTIONS: Array<{ title: string; shortcuts: Array<{ keys: string[]; label: string }> }> = [
    {
      title: 'Anywhere',
      shortcuts: [
        { keys: ['Ctrl', 'K'], label: 'Open the command palette' },
        { keys: ['?'], label: 'Show this list' },
        { keys: ['Esc'], label: 'Close a dialog, or leave focus mode' }
      ]
    },
    {
      title: 'Writing a scene',
      shortcuts: [
        { keys: ['Ctrl', 'S'], label: 'Save now (scenes also autosave)' },
        { keys: ['F11'], label: 'Toggle focus mode' },
        { keys: ['Ctrl', 'B'], label: 'Bold' },
        { keys: ['Ctrl', 'I'], label: 'Italic' },
        { keys: ['@'], label: 'Mention an entity' }
      ]
    }
  ];

  /** Typing "?" into a field is a question mark, not a shortcut. */
  function isTextEntry(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTextEntry(e.target)) return;
    e.preventDefault();
    shortcuts.toggle();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Dialog.Root bind:open={shortcuts.open}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Keyboard class="h-4 w-4" />
        Keyboard Shortcuts
      </Dialog.Title>
      <Dialog.Description>Press ? at any time to bring this back.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      {#each SECTIONS as section (section.title)}
        <div>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h3>
          <div class="space-y-1.5">
            {#each section.shortcuts as shortcut (shortcut.label)}
              <div class="flex items-center justify-between gap-4 text-sm">
                <span>{shortcut.label}</span>
                <span class="flex shrink-0 items-center gap-1">
                  {#each shortcut.keys as key (key)}
                    <kbd
                      class="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {key}
                    </kbd>
                  {/each}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </Dialog.Content>
</Dialog.Root>
