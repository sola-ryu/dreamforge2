<script lang="ts">
  import { GripVertical, Link2, Link2Off } from '@lucide/svelte';

  interface Beat {
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
    onLinkScene
  }: {
    beats: Beat[];
    scenes: SceneInfo[];
    onReorder?: (beatTitles: string[]) => void;
    onLinkScene?: (beatTitle: string, sceneId: string | null) => void;
  } = $props();

  let dragBeat = $state<string | null>(null);

  function handleDragStart(e: DragEvent, title: string) {
    dragBeat = title;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: DragEvent, targetTitle: string) {
    e.preventDefault();
    if (!dragBeat || dragBeat === targetTitle) return;
    const titles = beats.map((b) => b.title);
    const fromIdx = titles.indexOf(dragBeat);
    const toIdx = titles.indexOf(targetTitle);
    if (fromIdx === -1 || toIdx === -1) return;
    titles.splice(fromIdx, 1);
    titles.splice(toIdx, 0, dragBeat);
    onReorder?.(titles);
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

  function isLinked(sceneId: string | null): boolean {
    return sceneId !== null && scenes.some((s) => s.id === sceneId);
  }
</script>

<div class="space-y-1">
  {#each beats as beat, i}
    <div
      class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
      draggable="true"
      role="listitem"
      ondragstart={(e) => handleDragStart(e, beat.title)}
      ondragover={handleDragOver}
      ondrop={(e) => handleDrop(e, beat.title)}
    >
      <GripVertical class="h-4 w-4 cursor-grab text-muted-foreground opacity-40" />
      <span
        class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground"
        >{i + 1}</span
      >
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
        onchange={(e) => onLinkScene?.(beat.title, (e.target as HTMLSelectElement).value || null)}
      >
        <option value="">No scene</option>
        {#each scenes as scene}
          <option value={scene.id}
            >{scene.chapterTitle ? `${scene.chapterTitle} / ` : ''}{scene.title ||
              'Untitled'}</option
          >
        {/each}
      </select>
    </div>
  {/each}
</div>
