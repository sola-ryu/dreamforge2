<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
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
    Download,
    Check,
    CloudOff,
    Loader2
  } from '@lucide/svelte';
  import { getZenMode } from '$lib/stores/zenMode.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import EntityPicker from '$lib/components/EntityPicker.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { countWords, formatWordCount } from '$lib/utils/wordCount';
  import type { EntityType } from '$lib/types';

  const zen = getZenMode();

  const AUTOSAVE_DELAY = 1500;

  interface SceneRow {
    id: string;
    title: string | null;
    narrator: string | null;
    time: string | null;
    place: string | null;
    participants: string[];
    backgroundImage: string | null;
    body: string;
    [key: string]: unknown;
  }

  interface ChapterRow {
    id: string;
    title: string;
    scenes: SceneRow[];
  }

  let showCreateChapter = $state(false);
  let chapterTitle = $state('');
  let expandedChapters = $state<Set<string>>(new Set());
  let activeSceneId = $state<string | null>(null);
  let sceneBody = $state('');
  let sceneTitle = $state('');
  let sceneNarrator = $state('');
  let sceneTime = $state('');
  let scenePlace = $state('');
  let sceneParticipants = $state<string[]>([]);
  let sceneBackgroundImage = $state('');
  let activeChapterId = $state('');

  let savedSnapshot = $state('');
  let saving = $state(false);
  let saveError = $state('');
  let lastSavedAt = $state<Date | null>(null);
  let sessionStartWords = $state<number | null>(null);

  let dragChapterId = $state<string | null>(null);
  let dragSceneId = $state<string | null>(null);

  let initialSceneId = $state<string | null>(null);
  let initialSceneHandled = $state(false);

  // Writable derived: reloads follow the server, and saveScene() can patch a scene
  // locally so word counts update without a round trip.
  let chapters = $derived((page.data?.chapters || []) as ChapterRow[]);
  let role = $derived(page.data?.role || 'owner');
  let canEdit = $derived(role !== 'commenter');
  let pickerEntities = $derived(
    (page.data?.entities || []) as Array<{ id: string; name: string; type: EntityType }>
  );

  let storyWords = $derived(
    chapters.reduce(
      (total, ch) => total + ch.scenes.reduce((sum, s) => sum + countWords(s.body), 0),
      0
    )
  );

  $effect(() => {
    if (sessionStartWords === null && chapters.length > 0) sessionStartWords = storyWords;
  });

  let sessionWords = $derived(sessionStartWords === null ? 0 : storyWords - sessionStartWords);
  let sceneWords = $derived(countWords(sceneBody));

  function chapterWords(chapter: ChapterRow): number {
    return chapter.scenes.reduce((sum, s) => sum + countWords(s.body), 0);
  }

  $effect(() => {
    const sceneParam = page.url.searchParams.get('scene');
    if (sceneParam && !initialSceneId) {
      initialSceneId = sceneParam;
    }
  });

  $effect(() => {
    const sceneId = initialSceneId;
    if (!sceneId || chapters.length === 0 || initialSceneHandled) return;

    for (const ch of chapters) {
      const scene = (ch.scenes || []).find((s) => s.id === sceneId);
      if (scene) {
        expandedChapters = new Set([...expandedChapters, ch.id]);
        loadScene(scene, ch.id);
        initialSceneHandled = true;
        break;
      }
    }
  });

  function currentValues() {
    return {
      title: sceneTitle,
      narrator: sceneNarrator,
      time: sceneTime,
      place: scenePlace,
      participants: sceneParticipants.join(', '),
      backgroundImage: sceneBackgroundImage,
      body: sceneBody
    };
  }

  let dirty = $derived(activeSceneId !== null && JSON.stringify(currentValues()) !== savedSnapshot);

  function loadScene(scene: SceneRow, chapterId: string) {
    activeSceneId = scene.id;
    activeChapterId = chapterId;
    sceneTitle = scene.title || '';
    sceneBody = scene.body || '';
    sceneNarrator = scene.narrator || '';
    sceneTime = scene.time || '';
    scenePlace = scene.place || '';
    sceneParticipants = [...(scene.participants || [])];
    sceneBackgroundImage = scene.backgroundImage || '';
    savedSnapshot = JSON.stringify(currentValues());
    saveError = '';
    zen.backgroundImage = scene.backgroundImage || null;
  }

  /** Never switch away from unsaved edits — flush them first. */
  async function openScene(scene: SceneRow, chapterId: string) {
    if (scene.id === activeSceneId) return;
    if (dirty) await saveScene();
    loadScene(scene, chapterId);
  }

  async function closeScene() {
    if (dirty) await saveScene();
    zen.backgroundImage = null;
    if (zen.active) zen.active = false;
    activeSceneId = null;
    activeChapterId = '';
    sceneTitle = '';
    sceneBody = '';
    sceneNarrator = '';
    sceneTime = '';
    scenePlace = '';
    sceneParticipants = [];
    sceneBackgroundImage = '';
    savedSnapshot = '';
  }

  async function saveScene(): Promise<boolean> {
    if (!activeSceneId || !canEdit || saving) return false;

    const sceneId = activeSceneId;
    const chapterId = activeChapterId;
    const values = currentValues();
    const snapshot = JSON.stringify(values);

    saving = true;
    saveError = '';

    try {
      const form = new FormData();
      form.set('chapterId', chapterId);
      form.set('sceneId', sceneId);
      for (const [key, value] of Object.entries(values)) form.set(key, value);

      const res = await fetch('?/updateScene', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);

      savedSnapshot = snapshot;
      lastSavedAt = new Date();

      // Patch the local tree so word counts track the edit without a full reload.
      chapters = chapters.map((ch) =>
        ch.id !== chapterId
          ? ch
          : {
              ...ch,
              scenes: ch.scenes.map((s) =>
                s.id !== sceneId
                  ? s
                  : {
                      ...s,
                      title: values.title || null,
                      narrator: values.narrator || null,
                      time: values.time || null,
                      place: values.place || null,
                      participants: values.participants
                        .split(',')
                        .map((p) => p.trim())
                        .filter(Boolean),
                      backgroundImage: values.backgroundImage || null,
                      body: values.body
                    }
              )
            }
      );
      return true;
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Save failed';
      return false;
    } finally {
      saving = false;
    }
  }

  // Debounced autosave: the cleanup cancels the pending timer on every keystroke,
  // so the write only happens once typing pauses.
  $effect(() => {
    if (!dirty || !canEdit || saving) return;
    const timer = setTimeout(() => void saveScene(), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (activeSceneId) void saveScene();
    }
  }

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty) e.preventDefault();
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
    const ids = chapters.map((c) => c.id);
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
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    const ids = chapter.scenes.map((s) => s.id);
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
    await invalidateAll();
  }

  async function submitSceneReorder(chapterId: string, ids: string[]) {
    const form = new FormData();
    form.set('chapterId', chapterId);
    form.set('sceneIds', JSON.stringify(ids));
    await fetch('?/reorderScenes', { method: 'POST', body: form });
    await invalidateAll();
  }

  /** Open a scene created by the server action as soon as it appears in the tree. */
  function openSceneById(sceneId: string) {
    for (const ch of chapters) {
      const scene = ch.scenes.find((s) => s.id === sceneId);
      if (scene) {
        expandedChapters = new Set([...expandedChapters, ch.id]);
        loadScene(scene, ch.id);
        return;
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={handleBeforeUnload} />

<svelte:head>
  <title
    >{page.data?.story?.title || 'Story'} — {page.data?.projectName || 'Project'} — DreamForge</title
  >
</svelte:head>

<div class="flex h-[calc(100vh-4rem)]">
  <!-- Left panel: chapter/scene tree -->
  <div class="w-72 flex-shrink-0 overflow-y-auto border-r border-border bg-card p-4 sm:w-80">
    <div class="mb-4">
      <a
        href="/projects/{page.params.id}/stories"
        class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="h-4 w-4" />
        Back
      </a>
      <div class="mt-2 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{page.data?.story?.title || 'Story'}</h2>
        <div class="flex flex-wrap items-center gap-1">
          <Button
            href="/projects/{page.params.id}/stories/{page.params.storyId}/export"
            target="_blank"
            variant="outline"
            size="xs"
          >
            <Download class="h-3 w-3" />
            Export
          </Button>
          <Button
            href="/projects/{page.params.id}/stories/{page.params.storyId}/summaries"
            variant="outline"
            size="xs"
          >
            <LayoutList class="h-3 w-3" />
            Summaries
          </Button>
        </div>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">
        {formatWordCount(storyWords)} words
        {#if sessionWords > 0}
          <span class="text-primary">· +{formatWordCount(sessionWords)} this session</span>
        {/if}
      </p>
    </div>

    <Button
      variant="outline"
      class="mb-4 w-full border-dashed text-muted-foreground hover:border-primary hover:text-foreground"
      onclick={() => (showCreateChapter = !showCreateChapter)}
    >
      <Plus class="h-4 w-4" />
      Add Chapter
    </Button>

    {#if showCreateChapter}
      <div class="mb-4 rounded-lg border border-border bg-background p-3">
        <form
          method="POST"
          action="?/createChapter"
          use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                showCreateChapter = false;
                chapterTitle = '';
                await update();
              }
            };
          }}
        >
          <Input
            name="title"
            type="text"
            required
            bind:value={chapterTitle}
            class="mb-2"
            placeholder="Chapter title"
          />
          <div class="flex gap-1">
            <Button type="submit" size="xs">Create</Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onclick={() => (showCreateChapter = false)}>Cancel</Button
            >
          </div>
        </form>
      </div>
    {/if}

    <div class="space-y-2">
      {#each chapters as chapter, i (chapter.id)}
        <div
          class="rounded-lg border border-border"
          draggable="true"
          role="listitem"
          ondragstart={(e) => handleChapterDragStart(e, chapter.id)}
          ondragover={handleDragOver}
          ondrop={(e) => handleChapterDrop(e, chapter.id)}
        >
          <div
            class="group flex cursor-pointer items-center gap-1 px-3 py-2 hover:bg-secondary/50"
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
            <span class="text-xs text-muted-foreground">
              {formatWordCount(chapterWords(chapter))}w
            </span>
            <div
              class="opacity-0 group-hover:opacity-100"
              onclick={(e) => e.stopPropagation()}
              onkeypress={(e) => {
                if (e.key === 'Enter') e.stopPropagation();
              }}
              role="button"
              tabindex="-1"
            >
              <form method="POST" action="?/deleteChapter">
                <input type="hidden" name="chapterId" value={chapter.id} />
                <Button type="submit" variant="ghost" size="icon-xs" aria-label="Delete chapter">
                  <Trash2 class="h-3 w-3 text-destructive" />
                </Button>
              </form>
            </div>
            {#if expandedChapters.has(chapter.id)}
              <ChevronDown class="h-3 w-3 text-muted-foreground" />
            {:else}
              <ChevronRight class="h-3 w-3 text-muted-foreground" />
            {/if}
          </div>

          {#if expandedChapters.has(chapter.id)}
            <div class="border-t border-border pb-2">
              {#each chapter.scenes as scene, j (scene.id)}
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
                  <span class="text-xs text-muted-foreground group-hover:hidden">
                    {formatWordCount(countWords(scene.body))}
                  </span>
                  <div
                    class="hidden group-hover:block"
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
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Delete scene"
                      >
                        <Trash2 class="h-3 w-3 text-destructive" />
                      </Button>
                    </form>
                  </div>
                </div>
              {/each}
              <form
                method="POST"
                action="?/createScene"
                class="px-3 pt-1"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    if (result.type === 'success') {
                      const created = (result.data as { sceneId?: string })?.sceneId;
                      await update();
                      if (created) openSceneById(created);
                    }
                  };
                }}
              >
                <input type="hidden" name="chapterId" value={chapter.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="xs"
                  class="text-muted-foreground hover:text-foreground"
                >
                  <Plus class="h-3 w-3" /> Add Scene
                </Button>
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
      <div class="p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <input
            type="text"
            bind:value={sceneTitle}
            class="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold outline-none"
            placeholder="Scene title..."
          />
          <div class="flex items-center gap-2">
            <span class="whitespace-nowrap text-xs text-muted-foreground">
              {formatWordCount(sceneWords)} words
            </span>
            <span
              class="flex items-center gap-1 whitespace-nowrap text-xs"
              class:text-destructive={saveError}
              class:text-muted-foreground={!saveError}
            >
              {#if saveError}
                <CloudOff class="h-3 w-3" />
                {saveError}
              {:else if saving}
                <Loader2 class="h-3 w-3 animate-spin" />
                Saving…
              {:else if dirty}
                Unsaved changes
              {:else if lastSavedAt}
                <Check class="h-3 w-3" />
                Saved
              {/if}
            </span>
            <Button onclick={() => saveScene()} disabled={saving || !dirty || !canEdit}>
              <Save class="h-4 w-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              title="Convert to Note"
              aria-label="Convert to Note"
              onclick={async () => {
                const f = new FormData();
                f.set('chapterId', activeChapterId);
                f.set('sceneId', activeSceneId || '');
                await fetch('?/convertToNote', { method: 'POST', body: f });
                savedSnapshot = JSON.stringify(currentValues());
                await invalidateAll();
                await closeScene();
              }}
            >
              <SwitchCamera class="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onclick={closeScene}>Close</Button>
          </div>
        </div>

        <div class="mb-4 flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2">
            <label for="scene-narrator" class="text-muted-foreground">Narrator:</label>
            <Input
              id="scene-narrator"
              type="text"
              list="scene-characters"
              bind:value={sceneNarrator}
              class="h-7 w-auto"
              placeholder="Who narrates?"
            />
          </div>
          <div class="flex items-center gap-2">
            <label for="scene-time" class="text-muted-foreground">Time:</label>
            <Input
              id="scene-time"
              type="text"
              bind:value={sceneTime}
              class="h-7 w-auto"
              placeholder="When?"
            />
          </div>
          <div class="flex items-center gap-2">
            <label for="scene-place" class="text-muted-foreground">Place:</label>
            <Input
              id="scene-place"
              type="text"
              list="scene-locations"
              bind:value={scenePlace}
              class="h-7 w-auto"
              placeholder="Where?"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-muted-foreground">Participants:</span>
            <EntityPicker
              entities={pickerEntities}
              bind:value={sceneParticipants}
              types={['character', 'organization', 'species']}
              placeholder="Add character"
              searchPlaceholder="Search characters…"
              disabled={!canEdit}
            />
          </div>
          <div class="flex items-center gap-2">
            <Image class="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              bind:value={sceneBackgroundImage}
              class="h-7 w-auto"
              placeholder="Background image URL for Zen Mode"
            />
          </div>
        </div>

        <datalist id="scene-characters">
          {#each pickerEntities.filter((e) => e.type === 'character') as entity (entity.id)}
            <option value={entity.name}></option>
          {/each}
        </datalist>
        <datalist id="scene-locations">
          {#each pickerEntities.filter((e) => e.type === 'location') as entity (entity.id)}
            <option value={entity.name}></option>
          {/each}
        </datalist>

        {#key activeSceneId}
          <Editor
            content={sceneBody}
            entities={page.data?.entities || []}
            onUpdate={(md) => (sceneBody = md)}
          />
        {/key}
      </div>
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
