<script lang="ts">
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import {
    ArrowLeft,
    Plus,
    Trash2,
    GripVertical,
    FileText,
    ChevronDown,
    ChevronRight,
    BookOpen,
    Save,
    Image,
    LayoutList,
    SwitchCamera,
    Download
  } from 'lucide-svelte';
  import { getZenMode } from '$lib/stores/zenMode.svelte';
  import Editor from '$lib/components/Editor.svelte';

  const zen = getZenMode();

  let showCreateChapter = $state(false);
  let chapterTitle = $state('');
  let expandedChapters = $state<Set<string>>(new Set());
  let activeSceneId = $state<string | null>(null);
  let sceneBody = $state('');
  let sceneTitle = $state('');
  let sceneNarrator = $state('');
  let sceneTime = $state('');
  let scenePlace = $state('');
  let sceneParticipants = $state('');
  let sceneBackgroundImage = $state('');
  let activeChapterId = $state('');
  let isSaving = $state(false);

  let dragChapterId = $state<string | null>(null);
  let dragSceneId = $state<string | null>(null);

  function openScene(scene: any, chapterId: string) {
    activeSceneId = scene.id;
    activeChapterId = chapterId;
    sceneTitle = scene.title || '';
    sceneBody = scene.body || '';
    sceneNarrator = scene.narrator || '';
    sceneTime = scene.time || '';
    scenePlace = scene.place || '';
    sceneParticipants = (scene.participants || []).join(', ');
    sceneBackgroundImage = scene.backgroundImage || '';
    zen.backgroundImage = scene.backgroundImage || null;
  }

  function closeScene() {
    zen.backgroundImage = null;
    if (zen.active) zen.active = false;
    activeSceneId = null;
    activeChapterId = '';
    sceneTitle = '';
    sceneBody = '';
    sceneNarrator = '';
    sceneTime = '';
    scenePlace = '';
    sceneParticipants = '';
    sceneBackgroundImage = '';
  }

  function toggleChapter(id: string) {
    const next = new Set(expandedChapters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedChapters = next;
  }

  function handleChapterDragStart(e: DragEvent, id: string) {
    dragChapterId = id;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleChapterDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragChapterId || dragChapterId === targetId) return;
    const chapters = $page.data?.chapters || [];
    const ids = chapters.map((c: any) => c.id);
    const fromIdx = ids.indexOf(dragChapterId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragChapterId);
    submitChapterReorder(ids);
    dragChapterId = null;
  }

  function handleSceneDragStart(e: DragEvent, sceneId: string) {
    dragSceneId = sceneId;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleSceneDrop(e: DragEvent, chapterId: string, targetId: string) {
    e.preventDefault();
    if (!dragSceneId || dragSceneId === targetId) return;
    const chapter = ($page.data?.chapters || []).find((c: any) => c.id === chapterId);
    if (!chapter) return;
    const ids = chapter.scenes.map((s: any) => s.id);
    const fromIdx = ids.indexOf(dragSceneId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragSceneId);
    submitSceneReorder(chapterId, ids);
    dragSceneId = null;
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  async function submitChapterReorder(ids: string[]) {
    const form = new FormData();
    form.set('chapterIds', JSON.stringify(ids));
    await fetch('?/reorderChapters', { method: 'POST', body: form });
    window.location.reload();
  }

  async function submitSceneReorder(chapterId: string, ids: string[]) {
    const form = new FormData();
    form.set('chapterId', chapterId);
    form.set('sceneIds', JSON.stringify(ids));
    await fetch('?/reorderScenes', { method: 'POST', body: form });
    window.location.reload();
  }
</script>

<svelte:head>
  <title
    >{$page.data?.story?.title || 'Story'} — {$page.data?.projectName || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="flex h-[calc(100vh-4rem)]">
  <!-- Left panel: chapter/scene tree -->
  <div class="w-72 flex-shrink-0 overflow-y-auto border-r border-border bg-card p-4 sm:w-80">
    <div class="mb-4">
      <a
        href="/projects/{$page.params.id}/stories"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Back
      </a>
      <div class="mt-2 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{$page.data?.story?.title || 'Story'}</h2>
        <div class="flex flex-wrap items-center gap-1">
          <a
            href="/projects/{$page.params.id}/stories/{$page.params.storyId}/export"
            target="_blank"
            class="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
          >
            <Download class="h-3 w-3" />
            Export
          </a>
          <a
            href="/projects/{$page.params.id}/stories/{$page.params.storyId}/summaries"
            class="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
          >
            <LayoutList class="h-3 w-3" />
            Summaries
          </a>
        </div>
      </div>
    </div>

    <button
      class="mb-4 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
      onclick={() => (showCreateChapter = !showCreateChapter)}
    >
      <Plus class="h-4 w-4" />
      Add Chapter
    </button>

    {#if showCreateChapter}
      <div class="mb-4 rounded-lg border border-border bg-background p-3">
        <form
          method="POST"
          action="?/createChapter"
          use:enhance={() => {
            return async ({ result }) => {
              if (result.type === 'success') {
                showCreateChapter = false;
                chapterTitle = '';
              }
            };
          }}
        >
          <input
            name="title"
            type="text"
            required
            bind:value={chapterTitle}
            class="mb-2 w-full rounded border border-input bg-background px-2 py-1 text-sm"
            placeholder="Chapter title"
          />
          <div class="flex gap-1">
            <button
              type="submit"
              class="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Create</button
            >
            <button
              type="button"
              class="rounded border border-border px-2 py-1 text-xs"
              onclick={() => (showCreateChapter = false)}>Cancel</button
            >
          </div>
        </form>
      </div>
    {/if}

    <div class="space-y-2">
      {#each $page.data?.chapters || [] as chapter, i}
        <div
          class="rounded-lg border border-border"
          draggable="true"
          role="listitem"
          ondragstart={(e) => handleChapterDragStart(e, chapter.id)}
          ondragover={handleDragOver}
          ondrop={(e) => handleChapterDrop(e, chapter.id)}
        >
          <div
            class="flex cursor-pointer items-center gap-1 px-3 py-2 hover:bg-secondary/50"
            onclick={() => toggleChapter(chapter.id)}
            role="button"
            tabindex="0"
            onkeypress={(e) => {
              if (e.key === 'Enter') toggleChapter(chapter.id);
            }}
          >
            <GripVertical class="h-3 w-3 cursor-grab text-muted-foreground opacity-40" />
            <span class="text-xs text-muted-foreground">{i + 1}</span>
            <span class="flex-1 truncate text-sm font-medium">{chapter.title}</span>
            <span class="text-xs text-muted-foreground">{chapter.scenes?.length || 0}</span>
            {#if expandedChapters.has(chapter.id)}
              <ChevronDown class="h-3 w-3 text-muted-foreground" />
            {:else}
              <ChevronRight class="h-3 w-3 text-muted-foreground" />
            {/if}
          </div>

          {#if expandedChapters.has(chapter.id)}
            <div class="border-t border-border pb-2">
              {#each chapter.scenes as scene, j}
                <div
                  class="group flex cursor-pointer items-center gap-1 px-3 py-1.5 pl-6 text-sm"
                  class:bg-secondary={activeSceneId === scene.id}
                  draggable="true"
                  role="button"
                  tabindex="0"
                  ondragstart={(e) => handleSceneDragStart(e, scene.id)}
                  ondragover={handleDragOver}
                  ondrop={(e) => handleSceneDrop(e, chapter.id, scene.id)}
                  onclick={() => openScene(scene, chapter.id)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') openScene(scene, chapter.id);
                  }}
                >
                  <GripVertical
                    class="h-3 w-3 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100"
                  />
                  <FileText class="h-3 w-3 text-muted-foreground" />
                  <span class="flex-1 truncate">{scene.title || `Scene ${j + 1}`}</span>
                  <div
                    class="max-sm:opacity-100 opacity-0 group-hover:opacity-100"
                    onclick={(e) => e.stopPropagation()}
                    onkeypress={(e) => {
                      if (e.key === 'Enter') e.stopPropagation();
                    }}
                    role="button"
                    tabindex="-1"
                  >
                    <form method="POST" action="?/deleteScene">
                      <input type="hidden" name="chapterId" value={chapter.id} />
                      <input type="hidden" name="sceneId" value={scene.id} />
                      <button
                        type="submit"
                        class="rounded p-0.5 hover:bg-secondary"
                        aria-label="Delete scene"
                        ><Trash2 class="h-3 w-3 text-destructive" /></button
                      >
                    </form>
                  </div>
                </div>
              {/each}
              <form
                method="POST"
                action="?/createScene"
                class="px-3 pt-1"
                use:enhance={() => {
                  return async () => {
                    window.location.reload();
                  };
                }}
              >
                <input type="hidden" name="chapterId" value={chapter.id} />
                <button
                  type="submit"
                  class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus class="h-3 w-3" /> Add Scene
                </button>
              </form>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Right panel: scene editor -->
  <div class="flex-1 overflow-y-auto">
    {#if activeSceneId}
      <form
        method="POST"
        action="?/updateScene"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === 'success') isSaving = false;
          };
        }}
        class="p-6"
      >
        <input type="hidden" name="chapterId" value={activeChapterId} />
        <input type="hidden" name="sceneId" value={activeSceneId} />
        <input type="hidden" name="body" bind:value={sceneBody} />

        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <input
              type="text"
              name="title"
              bind:value={sceneTitle}
              class="border-0 bg-transparent text-lg font-semibold outline-none"
              placeholder="Scene title..."
            />
          </div>
          <div class="flex items-center gap-2">
            <button
              type="submit"
              class="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
              onclick={() => (isSaving = true)}
            >
              <Save class="h-4 w-4" />
              Save
            </button>
            <button
              class="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
              title="Convert to Note"
              aria-label="Convert to Note"
              onclick={async () => {
                const f = new FormData();
                f.set('chapterId', activeChapterId);
                f.set('sceneId', activeSceneId || '');
                await fetch('?/convertToNote', { method: 'POST', body: f });
                window.location.reload();
              }}
            >
              <SwitchCamera class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
              onclick={closeScene}
            >
              Close
            </button>
          </div>
        </div>

        <div class="mb-4 flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2">
            <label for="scene-narrator" class="text-muted-foreground">Narrator:</label>
            <input
              id="scene-narrator"
              type="text"
              name="narrator"
              bind:value={sceneNarrator}
              class="rounded border border-input bg-background px-2 py-1 text-sm"
              placeholder="Who narrates?"
            />
          </div>
          <div class="flex items-center gap-2">
            <label for="scene-time" class="text-muted-foreground">Time:</label>
            <input
              id="scene-time"
              type="text"
              name="time"
              bind:value={sceneTime}
              class="rounded border border-input bg-background px-2 py-1 text-sm"
              placeholder="When?"
            />
          </div>
          <div class="flex items-center gap-2">
            <label for="scene-place" class="text-muted-foreground">Place:</label>
            <input
              id="scene-place"
              type="text"
              name="place"
              bind:value={scenePlace}
              class="rounded border border-input bg-background px-2 py-1 text-sm"
              placeholder="Where?"
            />
          </div>
          <div class="flex items-center gap-2">
            <label for="scene-participants" class="text-muted-foreground">Participants:</label>
            <input
              id="scene-participants"
              type="text"
              name="participants"
              bind:value={sceneParticipants}
              class="rounded border border-input bg-background px-2 py-1 text-sm"
              placeholder="char_id1, char_id2"
            />
          </div>
          <div class="flex items-center gap-2">
            <Image class="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              name="backgroundImage"
              bind:value={sceneBackgroundImage}
              class="rounded border border-input bg-background px-2 py-1 text-sm"
              placeholder="Background image URL for Zen Mode"
            />
          </div>
        </div>

        <Editor
          content={sceneBody}
          entities={$page.data?.entities || []}
          onUpdate={(html) => (sceneBody = html)}
        />
      </form>
    {:else}
      <div class="flex h-full items-center justify-center text-muted-foreground">
        <div class="text-center">
          <BookOpen class="mx-auto h-12 w-12 opacity-20" />
          <p class="mt-2">Select a scene to start writing</p>
        </div>
      </div>
    {/if}
  </div>
</div>
