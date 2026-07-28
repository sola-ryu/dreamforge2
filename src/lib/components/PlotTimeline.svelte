<script lang="ts">
  import { GripVertical, Link2, Pencil, Trash2, Plus, Check, X } from '@lucide/svelte';

  interface Beat {
    id: string;
    title: string;
    sceneId: string | null;
    sortOrder: number;
  }

  interface SceneInfo {
    id: string;
    title: string | null;
    chapterTitle?: string;
  }

  let {
    beats = [],
    scenes = [],
    onReorder,
    onLinkScene,
    onAddBeat,
    onRenameBeat,
    onDeleteBeat
  }: {
    beats: Beat[];
    scenes: SceneInfo[];
    onReorder?: (beatIds: string[]) => void;
    onLinkScene?: (beatId: string, sceneId: string | null) => void;
    onAddBeat?: (title: string) => void;
    onRenameBeat?: (beatId: string, title: string) => void;
    onDeleteBeat?: (beatId: string) => void;
  } = $props();

  let dragBeat = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let editingTitle = $state('');
  let newBeatTitle = $state('');

  function handleDragStart(e: DragEvent, id: string) {
    dragBeat = id;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragBeat || dragBeat === targetId) return;
    const ids = beats.map((b) => b.id);
    const fromIdx = ids.indexOf(dragBeat);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragBeat);
    onReorder?.(ids);
    dragBeat = null;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function getSceneLabel(sceneId: string | null): string {
    if (!sceneId) return '';
    const scene = scenes.find((s) => s.id === sceneId);
    return scene ? scene.title || 'Untitled Scene' : sceneId;
  }

  function startEditing(beat: Beat) {
    editingId = beat.id;
    editingTitle = beat.title;
  }

  function cancelEditing() {
    editingId = null;
    editingTitle = '';
  }

  function saveEditing() {
    const title = editingTitle.trim();
    if (editingId && title) {
      onRenameBeat?.(editingId, title);
    }
    cancelEditing();
  }

  function addBeat() {
    const title = newBeatTitle.trim();
    if (!title) return;
    onAddBeat?.(title);
    newBeatTitle = '';
  }
</script>

<div class="space-y-1">
  {#each beats as beat, i (beat.id)}
    <div
      class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
      draggable="true"
      role="listitem"
      ondragstart={(e) => handleDragStart(e, beat.id)}
      ondragover={handleDragOver}
      ondrop={(e) => handleDrop(e, beat.id)}
    >
      <GripVertical class="h-4 w-4 cursor-grab text-muted-foreground opacity-40" />
      <span
        class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground"
        >{i + 1}</span
      >
      {#if editingId === beat.id}
        <input
          type="text"
          class="flex-1 rounded border border-input bg-background px-2 py-0.5 text-sm"
          bind:value={editingTitle}
          onkeydown={(e) => {
            if (e.key === 'Enter') saveEditing();
            if (e.key === 'Escape') cancelEditing();
          }}
        />
        <button
          class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Save beat title"
          onclick={saveEditing}
        >
          <Check class="h-3.5 w-3.5" />
        </button>
        <button
          class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Cancel editing"
          onclick={cancelEditing}
        >
          <X class="h-3.5 w-3.5" />
        </button>
      {:else}
        <span class="flex-1 text-sm">{beat.title}</span>
        {#if beat.sceneId}
          <a
            href="/scenes/{beat.sceneId}"
            class="flex items-center gap-1 rounded bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link2 class="h-3 w-3" />
            {getSceneLabel(beat.sceneId)}
          </a>
        {/if}
        <select
          class="rounded border border-input bg-background px-1 py-0.5 text-xs"
          value={beat.sceneId || ''}
          onchange={(e) => onLinkScene?.(beat.id, (e.target as HTMLSelectElement).value || null)}
        >
          <option value="">No scene</option>
          {#each scenes as scene (scene.id)}
            <option value={scene.id}
              >{scene.chapterTitle ? `${scene.chapterTitle} / ` : ''}{scene.title ||
                'Untitled'}</option
            >
          {/each}
        </select>
        <button
          class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Rename beat"
          onclick={() => startEditing(beat)}
        >
          <Pencil class="h-3.5 w-3.5" />
        </button>
        <button
          class="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
          aria-label="Delete beat"
          onclick={() => onDeleteBeat?.(beat.id)}
        >
          <Trash2 class="h-3.5 w-3.5" />
        </button>
      {/if}
    </div>
  {/each}

  <div class="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2">
    <Plus class="h-4 w-4 text-muted-foreground" />
    <input
      type="text"
      placeholder="Add a beat…"
      class="flex-1 rounded border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
      bind:value={newBeatTitle}
      onkeydown={(e) => {
        if (e.key === 'Enter') addBeat();
      }}
    />
    <button
      class="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
      onclick={addBeat}
    >
      Add
    </button>
  </div>
</div>
