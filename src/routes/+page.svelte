<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
  <title>DreamForge</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  {#if $page.data?.user}
    <div class="text-center">
      <h1 class="text-4xl font-bold">DreamForge</h1>
      <p class="mt-2 text-muted-foreground">Your worldbuilding companion</p>
      <Button class="mt-6" size="lg" onclick={() => goto('/projects')}>Go to Projects</Button>
    </div>
  {:else}
    <div class="text-center">
      <h1 class="text-4xl font-bold">DreamForge</h1>
      <p class="mt-2 text-muted-foreground">Open-source worldbuilding for fiction writers</p>
      <div class="mt-6 flex gap-4 justify-center">
        <Button href="/login" size="lg">Log In</Button>
        <Button href="/register" variant="outline" size="lg">Register</Button>
      </div>
    </div>
  {/if}
</div>
