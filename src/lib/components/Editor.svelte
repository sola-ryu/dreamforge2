<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Underline from '@tiptap/extension-underline';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import ImageExt from '@tiptap/extension-image';
  import Highlight from '@tiptap/extension-highlight';
  import TextAlign from '@tiptap/extension-text-align';
  import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';

  let { content = '', placeholder = 'Start writing...', onUpdate }: {
    content?: string;
    placeholder?: string;
    onUpdate?: (html: string) => void;
  } = $props();

  let editorEl: HTMLDivElement;
  let editor: Editor;
  let mounted = $state(false);

  onMount(() => {
    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] }
        }),
        Underline,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder }),
        ImageExt,
        Highlight,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader
      ],
      content,
      onUpdate: ({ editor: ed }) => {
        onUpdate?.(ed.getHTML());
      }
    });

    mounted = true;

    return () => {
      editor.destroy();
    };
  });

  function exec(command: string, value?: string) {
    switch (command) {
      case 'bold': editor.chain().focus().toggleBold().run(); break;
      case 'italic': editor.chain().focus().toggleItalic().run(); break;
      case 'underline': editor.chain().focus().toggleUnderline().run(); break;
      case 'strike': editor.chain().focus().toggleStrike().run(); break;
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'blockquote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
      case 'link': {
        const url = prompt('Enter URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
        break;
      }
      case 'table': editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'image': {
        const url = prompt('Enter image URL:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
        break;
      }
      case 'highlight': editor.chain().focus().toggleHighlight().run(); break;
      case 'left': editor.chain().focus().setTextAlign('left').run(); break;
      case 'center': editor.chain().focus().setTextAlign('center').run(); break;
      case 'right': editor.chain().focus().setTextAlign('right').run(); break;
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
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('bold')} title="Bold"><strong>B</strong></button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('italic')} title="Italic"><em>I</em></button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('underline')} title="Underline"><u>U</u></button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('strike')} title="Strike"><s>S</s></button>
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('h1')}>H1</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('h2')}>H2</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('h3')}>H3</button>
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('bullet')}>&#8226; List</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('ordered')}>1. List</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('blockquote')}>&#8220;</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('code')}>&lt;/&gt;</button>
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={setLink}>Link</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('table')}>Table</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('image')}>Image</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('highlight')}>HL</button>
      <span class="mx-1 border-l border-border"></span>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('left')}>&#8592;</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('center')}>&#8596;</button>
      <button class="rounded px-2 py-1 text-xs hover:bg-secondary" onclick={() => exec('right')}>&#8594;</button>
    </div>
  {/if}
  <div bind:this={editorEl} class="prose prose-sm dark:prose-invert max-w-none px-4 py-3 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p]:my-1"></div>
</div>

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
</style>
