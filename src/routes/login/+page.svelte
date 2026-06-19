<script lang="ts">
  import { enhance } from '$app/forms';

  let email = $state('');
  let password = $state('');
  let error = $state('');
</script>

<div class="flex min-h-screen items-center justify-center">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold">Log In</h1>
      <p class="mt-1 text-sm text-muted-foreground">Welcome back to DreamForge</p>
    </div>

    <form
      method="POST"
      action="?/login"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'failure') {
            error = result.data?.error || 'Login failed';
          } else if (result.type === 'redirect') {
            window.location.href = result.location;
          }
        };
      }}
      class="space-y-4"
    >
      {#if error}
        <div class="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      {/if}

      <div>
        <label for="email" class="block text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          bind:value={email}
          class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          bind:value={password}
          class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Log In
      </button>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      Don't have an account?
      <a href="/register" class="text-primary hover:underline">Register</a>
    </p>
  </div>
</div>
