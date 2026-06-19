<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>DreamForge</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  {#if $page.data?.user}
    <div class="text-center">
      <h1 class="text-4xl font-bold">DreamForge</h1>
      <p class="mt-2 text-muted-foreground">Your worldbuilding companion</p>
      <button
        class="mt-6 rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
        onclick={() => goto('/projects')}
      >
        Go to Projects
      </button>
    </div>
  {:else}
    <div class="text-center">
      <h1 class="text-4xl font-bold">DreamForge</h1>
      <p class="mt-2 text-muted-foreground">Open-source worldbuilding for fiction writers</p>
      <div class="mt-6 flex gap-4 justify-center">
        <a
          href="/login"
          class="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
        >
          Log In
        </a>
        <a href="/register" class="rounded-lg border border-border px-6 py-3 hover:bg-secondary">
          Register
        </a>
      </div>
    </div>
  {/if}
</div>
