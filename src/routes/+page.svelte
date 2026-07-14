<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { BookOpen, Map, Users, GitBranch, Timeline, ScrollText, Network } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card/index.js';
</script>

<svelte:head>
  <title>DreamForge — Worldbuilding for Fiction Writers</title>
</svelte:head>

{#if page.data?.user}
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <div class="mb-4 flex items-center justify-center gap-3">
        <BookOpen class="h-10 w-10 text-primary" />
        <h1 class="text-4xl font-bold">DreamForge</h1>
      </div>
      <p class="text-lg text-muted-foreground">Welcome back, {page.data.user.username}</p>
      <p class="mb-8 text-muted-foreground">Pick up where you left off</p>
      <Button size="lg" onclick={() => goto('/projects')}>Go to Projects</Button>
    </div>
  </div>
{:else}
  <div class="mx-auto max-w-5xl px-4 py-16 sm:py-24">
    <div class="text-center">
      <div class="mb-6 flex items-center justify-center gap-3">
        <BookOpen class="h-12 w-12 text-primary" />
        <h1 class="text-5xl font-bold tracking-tight">DreamForge</h1>
      </div>
      <p class="mx-auto mb-4 max-w-2xl text-xl text-muted-foreground">
        The open-source worldbuilding companion for fiction writers.
      </p>
      <p class="mx-auto mb-8 max-w-xl text-muted-foreground">
        Build rich, interconnected worlds with markdown-first editing, character profiles, location
        mapping, story planning, timelines, and relationship graphs — all stored on your own
        machine.
      </p>
      <div class="flex justify-center gap-4">
        <Button href="/login" size="lg">Log In</Button>
        <Button href="/register" variant="outline" size="lg">Register</Button>
      </div>
    </div>

    <div class="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <Card.Root>
        <Card.Header>
          <Users class="h-8 w-8 text-primary" />
          <Card.Title>Characters &amp; Organizations</Card.Title>
          <Card.Description>
            Profile characters with full backstory, traits, and relationships. Track organizations,
            factions, and their hierarchies.
          </Card.Description>
        </Card.Header>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Map class="h-8 w-8 text-primary" />
          <Card.Title>Locations &amp; Cultures</Card.Title>
          <Card.Description>
            Build continents, cities, and points of interest. Define cultures, species, and their
            histories.
          </Card.Description>
        </Card.Header>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <ScrollText class="h-8 w-8 text-primary" />
          <Card.Title>Stories &amp; Scenes</Card.Title>
          <Card.Description>
            Plan your narrative with chapters and scenes. Keep notes, plot threads, and research
            organized alongside your writing.
          </Card.Description>
        </Card.Header>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Timeline class="h-8 w-8 text-primary" />
          <Card.Title>Timelines</Card.Title>
          <Card.Description>
            Create and visualize timelines for your world's history, from ancient events to the
            present day.
          </Card.Description>
        </Card.Header>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Network class="h-8 w-8 text-primary" />
          <Card.Title>Relationship Maps</Card.Title>
          <Card.Description>
            Visualize connections between characters, locations, and events with an interactive
            force-directed graph.
          </Card.Description>
        </Card.Header>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <GitBranch class="h-8 w-8 text-primary" />
          <Card.Title>Markdown-First</Card.Title>
          <Card.Description>
            All content stored as plain Markdown files on disk. Self-hosted, portable, and never
            locked into a proprietary format.
          </Card.Description>
        </Card.Header>
      </Card.Root>
    </div>

    <div class="mt-16 text-center">
      <p class="mb-2 text-sm text-muted-foreground">Ready to start building?</p>
      <Button href="/register" size="lg">Create Your Account</Button>
    </div>
  </div>
{/if}
