<script lang="ts">
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import {
    BookOpen,
    Users,
    Building2,
    MapPin,
    Globe,
    Bug,
    Package,
    FileText,
    Share2,
    Settings,
    Trash2,
    Image as ImageIcon,
    RefreshCw,
    Sparkles,
    Clock,
    PenLine,
    Search,
    Download,
    ArrowRight
  } from '@lucide/svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { formatWordCount, readingMinutes } from '$lib/utils/wordCount';
  import { formatDate } from '$lib/utils';
  import { ENTITY_PLURAL } from '$lib/entityFields';
  import { entityTypeToRoute } from '$lib/utils/entityTypes';
  import type { EntityType, ProjectStats } from '$lib/types';

  let syncing = $state(false);

  let stats = $derived((page.data?.stats || null) as ProjectStats | null);
  let projectId = $derived(page.params.id);

  async function syncProject() {
    syncing = true;
    try {
      const res = await fetch(`/api/projects/${projectId}/sync`, { method: 'POST' });
      if (!res.ok) {
        console.error('Sync failed', await res.text());
      }
      await invalidateAll();
    } catch (e) {
      console.error('Sync error', e);
    } finally {
      syncing = false;
    }
  }

  const ENTITY_ICONS: Record<EntityType, typeof Users> = {
    character: Users,
    organization: Building2,
    location: MapPin,
    culture: Globe,
    species: Bug,
    item: Package,
    note: FileText
  };

  const TOOLS = [
    { label: 'Stories', icon: BookOpen, href: 'stories' },
    { label: 'Plots', icon: Sparkles, href: 'plots' },
    { label: 'Timelines', icon: Clock, href: 'timelines' },
    { label: 'Relations', icon: Share2, href: 'relations' },
    { label: 'Search', icon: Search, href: 'search' },
    { label: 'Images', icon: ImageIcon, href: 'images' },
    { label: 'Settings', icon: Settings, href: 'settings' },
    { label: 'Trash', icon: Trash2, href: 'trash' }
  ];

  let entityTypes = $derived(Object.keys(ENTITY_PLURAL) as EntityType[]);
</script>

<svelte:head>
  <title>{page.data?.project?.name || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-6">
  <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">{page.data?.project?.name || 'Project'}</h1>
      {#if page.data?.project?.description}
        <p class="mt-1 text-muted-foreground">{page.data.project.description}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <Button href="/projects/{projectId}/export" target="_blank" variant="outline">
        <Download class="h-4 w-4" />
        Export
      </Button>
      <Button onclick={syncProject} disabled={syncing} variant="outline">
        <RefreshCw class="h-4 w-4 {syncing ? 'animate-spin' : ''}" />
        {syncing ? 'Syncing…' : 'Sync Now'}
      </Button>
    </div>
  </div>

  {#if stats}
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="text-2xl font-semibold">{formatWordCount(stats.wordCount)}</div>
        <div class="text-xs text-muted-foreground">
          words · ~{readingMinutes(stats.wordCount)} min read
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="text-2xl font-semibold">{stats.sceneCount}</div>
        <div class="text-xs text-muted-foreground">
          scenes in {stats.chapterCount}
          {stats.chapterCount === 1 ? 'chapter' : 'chapters'}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="text-2xl font-semibold">{stats.storyCount}</div>
        <div class="text-xs text-muted-foreground">
          {stats.storyCount === 1 ? 'story' : 'stories'}
        </div>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <div class="text-2xl font-semibold">{stats.totalEntities}</div>
        <div class="text-xs text-muted-foreground">world entries</div>
      </div>
    </div>

    <div class="mb-6 grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-border bg-card p-4">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold">
          <PenLine class="h-4 w-4 text-primary" />
          Continue Writing
        </h2>
        {#if stats.lastScene}
          <a
            class="block rounded-md border border-border p-3 hover:bg-secondary"
            href="/projects/{projectId}/stories/{stats.lastScene.storyId}?scene={stats.lastScene
              .sceneId}"
          >
            <div class="font-medium">{stats.lastScene.title}</div>
            <div class="text-xs text-muted-foreground">{stats.lastScene.storyTitle}</div>
          </a>
        {:else}
          <p class="mb-3 text-sm text-muted-foreground">
            No scenes yet. Start a story and the last scene you touched shows up here.
          </p>
          <Button href="/projects/{projectId}/stories?new=1" size="sm">
            <BookOpen class="h-4 w-4" />
            Start a Story
          </Button>
        {/if}

        {#if stats.stories.length > 0}
          <div class="mt-4 space-y-2">
            {#each stats.stories as story (story.id)}
              <a
                class="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                href="/projects/{projectId}/stories/{story.id}"
              >
                <span class="truncate">{story.title}</span>
                <span class="whitespace-nowrap text-xs text-muted-foreground">
                  {formatWordCount(story.wordCount)} words · {story.sceneCount} scenes
                </span>
              </a>
            {/each}
          </div>
        {/if}
      </div>

      <div class="rounded-lg border border-border bg-card p-4">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock class="h-4 w-4 text-primary" />
          Recently Edited
        </h2>
        {#if stats.recent.length === 0}
          <p class="text-sm text-muted-foreground">Nothing edited yet.</p>
        {:else}
          <div class="space-y-1">
            {#each stats.recent as item (item.kind + item.id)}
              <a
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                href={item.href}
              >
                {#if item.kind === 'scene'}
                  <FileText class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {:else}
                  {@const Icon = ENTITY_ICONS[item.context as EntityType] || FileText}
                  <Icon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {/if}
                <span class="truncate">{item.name}</span>
                <span class="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(item.modifiedAt)}
                </span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <h2 class="mb-3 text-sm font-semibold text-muted-foreground">World</h2>
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {#each entityTypes as type (type)}
        {@const Icon = ENTITY_ICONS[type]}
        <a
          href="/projects/{projectId}/{entityTypeToRoute(type)}"
          class="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center hover:bg-secondary"
        >
          <Icon class="h-6 w-6 text-primary" />
          <span class="text-xs font-medium">{ENTITY_PLURAL[type]}</span>
          <span class="text-xs text-muted-foreground">{stats.entityCounts[type] ?? 0}</span>
        </a>
      {/each}
    </div>
  {/if}

  <h2 class="mb-3 text-sm font-semibold text-muted-foreground">Tools</h2>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {#each TOOLS as tool (tool.href)}
      <a
        href="/projects/{projectId}/{tool.href}"
        class="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-secondary"
      >
        <tool.icon class="h-5 w-5 text-primary" />
        <span class="text-sm font-medium">{tool.label}</span>
        <ArrowRight
          class="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        />
      </a>
    {/each}
  </div>
</div>
