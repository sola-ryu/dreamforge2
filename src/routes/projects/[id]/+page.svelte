<script lang="ts">
  import { page } from '$app/stores';
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
    Image as ImageIcon
  } from 'lucide-svelte';
  import type { EntityType } from '$lib/types';

  const modules: Array<{
    type: EntityType | 'stories' | 'relations' | 'settings' | 'trash' | 'images';
    label: string;
    icon: any;
    href: string;
  }> = [
    { type: 'stories', label: 'Stories', icon: BookOpen, href: 'stories' },
    { type: 'character', label: 'Characters', icon: Users, href: 'characters' },
    { type: 'organization', label: 'Organizations', icon: Building2, href: 'organizations' },
    { type: 'location', label: 'Locations', icon: MapPin, href: 'locations' },
    { type: 'culture', label: 'Cultures', icon: Globe, href: 'cultures' },
    { type: 'species', label: 'Species', icon: Bug, href: 'species' },
    { type: 'item', label: 'Items', icon: Package, href: 'items' },
    { type: 'note', label: 'Notes', icon: FileText, href: 'notes' },
    { type: 'relations', label: 'Relations', icon: Share2, href: 'relations' },
    { type: 'settings', label: 'Settings', icon: Settings, href: 'settings' },
    { type: 'trash', label: 'Trash', icon: Trash2, href: 'trash' },
    { type: 'images', label: 'Images', icon: ImageIcon, href: 'images' }
  ];
</script>

<svelte:head>
  <title>{$page.data?.project?.name || 'Project'} — DreamForge</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
  <h1 class="mb-2 text-2xl font-bold">{$page.data?.project?.name || 'Project'}</h1>
  {#if $page.data?.project?.description}
    <p class="mb-6 text-muted-foreground">{$page.data.project.description}</p>
  {/if}

  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {#each modules as mod}
      <a
        href="/projects/{$page.params.id}/{mod.href}"
        class="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center hover:bg-secondary"
      >
        <mod.icon class="h-8 w-8 text-primary" />
        <span class="text-sm font-medium">{mod.label}</span>
      </a>
    {/each}
  </div>
</div>
