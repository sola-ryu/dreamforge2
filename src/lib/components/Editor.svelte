<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import ImageExt from '@tiptap/extension-image';
  import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
  import { Markdown } from '@tiptap/markdown';
  import Mention from '@tiptap/extension-mention';

  import { Maximize2, Minimize2, SpellCheck } from 'lucide-svelte';
  import { getZenMode } from '$lib/stores/zenMode.svelte';

  const zen = getZenMode();

  let {
    content = '',
    placeholder = 'Start writing...',
    entities = [],
    onUpdate
  }: {
    content?: string;
    placeholder?: string;
    entities?: { id: string; type: string; name: string; status?: string }[];
    onUpdate?: (md: string) => void;
  } = $props();

  let editorEl: HTMLDivElement;
  let editor: Editor;
  let mounted = $state(false);

  let spellcheckEnabled = $state(localStorage.getItem('editor:spellcheck') !== 'false');
  let editorLang = $state(localStorage.getItem('editor:lang') || 'en');
  let hoverMention = $state<{
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  function toggleSpellcheck() {
    spellcheckEnabled = !spellcheckEnabled;
    localStorage.setItem('editor:spellcheck', String(spellcheckEnabled));
  }

  function setLang(lang: string) {
    editorLang = lang;
    localStorage.setItem('editor:lang', lang);
  }

  function setupMentionHover() {
    const view = editor.view;
    if (!view) return;
    view.dom.addEventListener('mouseover', (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-mention]');
      if (target instanceof HTMLElement) {
        hoverMention = {
          id: target.dataset.id || '',
          type: target.dataset.type || '',
          label: target.textContent?.replace(/^@/, '') || '',
          x: e.clientX,
          y: e.clientY
        };
      } else {
        hoverMention = null;
      }
    });
    view.dom.addEventListener('mouseleave', () => {
      hoverMention = null;
    });
  }

  function positionDropdown(dom: HTMLElement, rect: DOMRect) {
    dom.style.position = 'fixed';
    dom.style.left = `${rect.left}px`;
    dom.style.top = `${rect.bottom + 4}px`;
    dom.style.zIndex = '100';
  }

  onMount(() => {
    const mentionExt = Mention.configure({
      HTMLAttributes: { class: 'mention-node' },
      suggestion: {
        items: ({ query }: { query: string }) => {
          return entities
            .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8)
            .map((e) => ({ id: e.id, type: e.type, label: e.name }));
        },
        render: () => {
          let dom: HTMLDivElement;
          return {
            onStart: (props: any) => {
              dom = document.createElement('div');
              dom.className = 'mention-dropdown';
              document.body.appendChild(dom);
              if (props.clientRect) positionDropdown(dom, props.clientRect());
              const update = () => {
                dom.innerHTML = props.items
                  .map(
                    (item: any, i: number) =>
                      `<button class="${i === props.selectedIndex ? 'bg-accent' : ''} flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent" data-index="${i}">${item.label}<span class="ml-auto text-xs text-muted-foreground">${item.type}</span></button>`
                  )
                  .join('');
                dom.querySelectorAll('button').forEach((btn) => {
                  btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const idx = parseInt(btn.dataset.index || '0', 10);
                    props.command({
                      id: props.items[idx].id,
                      type: props.items[idx].type,
                      label: props.items[idx].label
                    });
                  });
                });
              };
              update();
            },
            onUpdate: (props: any) => {
              if (props.clientRect) positionDropdown(dom, props.clientRect());
              dom.innerHTML = props.items
                .map(
                  (item: any, i: number) =>
                    `<button class="${i === props.selectedIndex ? 'bg-accent' : ''} flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent" data-index="${i}">${item.label}<span class="ml-auto text-xs text-muted-foreground">${item.type}</span></button>`
                )
                .join('');
              dom.querySelectorAll('button').forEach((btn) => {
                btn.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  const idx = parseInt(btn.dataset.index || '0', 10);
                  props.command({
                    id: props.items[idx].id,
                    type: props.items[idx].type,
                    label: props.items[idx].label
                  });
                });
              });
            },
            onExit: () => {
              if (dom) dom.remove();
            }
          };
        }
      }
    });

    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] }
        }),
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder }),
        ImageExt,
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        Markdown.configure({
          indentation: { style: 'space', size: 2 }
        }),
        mentionExt
      ],
      content,
      contentType: 'markdown',
      onUpdate: ({ editor: ed }) => {
        onUpdate?.(ed.getMarkdown());
      }
    });

    mounted = true;
    setupMentionHover();

    return () => {
      editor.destroy();
    };
  });

  function exec(command: string, value: string = '') {
    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'link': {
        const url = prompt('Enter URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
        break;
      }
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'image': {
        const url = prompt('Enter image URL:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
        break;
      }
      case 'tableRowBefore':
        editor.chain().focus().addRowBefore().run();
        break;
      case 'tableRowAfter':
        editor.chain().focus().addRowAfter().run();
        break;
      case 'tableRowDelete':
        editor.chain().focus().deleteRow().run();
        break;
      case 'tableColBefore':
        editor.chain().focus().addColumnBefore().run();
        break;
      case 'tableColAfter':
        editor.chain().focus().addColumnAfter().run();
        break;
      case 'tableColDelete':
        editor.chain().focus().deleteColumn().run();
        break;
    }
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = prompt('Enter URL:', previousUrl || '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
</script>

<div class="editor-wrapper rounded-lg border border-border bg-background">
  {#if mounted}
    <div class="flex flex-wrap gap-0.5 border-b border-border bg-muted/50 px-2 py-1.5">
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('bold')}
        title="Bold"><strong>B</strong></button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('italic')}
        title="Italic"><em>I</em></button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('strike')}
        title="Strike"><s>S</s></button
      >
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('h1')}
        >H1</button
      >
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('h2')}
        >H2</button
      >
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('h3')}
        >H3</button
      >
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('bullet')}
        >&#8226; List</button
      >
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('ordered')}
        >1. List</button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('blockquote')}>&#8220;</button
      >
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('code')}
        >&lt;/&gt;</button
      >
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={setLink}>Link</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('table')}
        >Table</button
      >
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('image')}
        >Image</button
      >
      <span class="mx-1 border-l border-border"></span>
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('tableRowBefore')}
        title="Insert row before">&#8593; Row</button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('tableRowAfter')}
        title="Insert row after">&#8595; Row</button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('tableRowDelete')}
        title="Delete row">&times; Row</button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('tableColBefore')}
        title="Insert column before">&#8592; Col</button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('tableColAfter')}
        title="Insert column after">&#8594; Col</button
      >
      <button
        class="rounded px-2 py-1 text-xs hover:bg-secondary"
        onclick={() => exec('tableColDelete')}
        title="Delete column">&times; Col</button
      >
      <span class="mx-1 border-l border-border"></span>
      <button
        class="rounded px-2 py-1 hover:bg-secondary"
        onclick={() => zen.toggle()}
        title={zen.active ? 'Exit Zen Mode' : 'Zen Mode'}
      >
        {#if zen.active}
          <Minimize2 class="h-3.5 w-3.5" />
        {:else}
          <Maximize2 class="h-3.5 w-3.5" />
        {/if}
      </button>
      <span class="mx-1 border-l border-border"></span>
      <button
        class="rounded px-2 py-1 hover:bg-secondary"
        class:opacity-40={!spellcheckEnabled}
        onclick={toggleSpellcheck}
        title={spellcheckEnabled ? 'Spellcheck on' : 'Spellcheck off'}
      >
        <SpellCheck class="h-3.5 w-3.5" />
      </button>
      <select
        class="rounded border-0 bg-transparent px-1 py-1 text-xs hover:bg-secondary"
        value={editorLang}
        onchange={(e) => setLang((e.target as HTMLSelectElement).value)}
        title="Editor language"
      >
        <option value="en">EN</option>
        <option value="fr">FR</option>
        <option value="de">DE</option>
        <option value="es">ES</option>
        <option value="it">IT</option>
        <option value="pt">PT</option>
        <option value="nl">NL</option>
      </select>
    </div>
  {/if}
  <div
    bind:this={editorEl}
    spellcheck={spellcheckEnabled}
    lang={editorLang}
    class="prose prose-sm dark:prose-invert max-w-none px-4 py-3 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p]:my-1"
  ></div>
</div>

{#if hoverMention}
  <div
    class="fixed z-50 rounded-lg border border-border bg-popover px-3 py-2 shadow-lg"
    style="left: {hoverMention.x}px; top: {hoverMention.y - 10}px; transform: translateY(-100%);"
  >
    <div class="text-sm font-medium">{hoverMention.label}</div>
    <div class="text-xs text-muted-foreground capitalize">{hoverMention.type}</div>
  </div>
{/if}

<style>
  .editor-wrapper :global(.ProseMirror) {
    outline: none;
    min-height: 200px;
  }
  .editor-wrapper :global(.ProseMirror p.is-editor-empty:first-child::before) {
    color: hsl(var(--muted-foreground));
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
  .editor-wrapper :global(.ProseMirror table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
  }
  .editor-wrapper :global(.ProseMirror th),
  .editor-wrapper :global(.ProseMirror td) {
    border: 1px solid hsl(var(--border));
    padding: 0.5em;
    min-width: 80px;
  }
  .editor-wrapper :global(.ProseMirror th) {
    background: hsl(var(--muted));
    font-weight: 600;
  }
  .editor-wrapper :global(.ProseMirror blockquote) {
    border-left: 3px solid hsl(var(--primary));
    padding-left: 1em;
    color: hsl(var(--muted-foreground));
  }
  .editor-wrapper :global(.ProseMirror code) {
    background: hsl(var(--muted));
    border-radius: 0.25em;
    padding: 0.125em 0.25em;
    font-size: 0.9em;
  }
  .editor-wrapper :global(.ProseMirror pre) {
    background: hsl(var(--muted));
    border-radius: 0.5em;
    padding: 1em;
    overflow-x: auto;
  }
  .editor-wrapper :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5em;
  }
  .editor-wrapper :global(.ProseMirror a) {
    color: hsl(var(--primary));
    text-decoration: underline;
    cursor: pointer;
  }
  .editor-wrapper :global([data-mention]) {
    background: hsl(var(--accent));
    border-radius: 0.25em;
    padding: 0.125em 0.25em;
    color: hsl(var(--accent-foreground));
    cursor: pointer;
  }
  :global(.mention-dropdown) {
    min-width: 12rem;
    max-height: 12rem;
    overflow-y: auto;
    border-radius: 0.5rem;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--popover));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
</style>
