<script lang="ts">
  import { enhance } from '$app/forms';

  let email = $state('');
  let username = $state('');
  let password = $state('');
  let error = $state('');
</script>

<div class="flex min-h-screen items-center justify-center">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold">Register</h1>
      <p class="mt-1 text-sm text-muted-foreground">Create your DreamForge account</p>
    </div>

    <form
      method="POST"
      action="?/register"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === 'failure') {
            error = result.data?.error || 'Registration failed';
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
        <label for="username" class="block text-sm font-medium">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          bind:value={username}
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
          minlength={8}
          bind:value={password}
          class="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Register
      </button>
    </form>

    <p class="text-center text-sm text-muted-foreground">
      Already have an account?
      <a href="/login" class="text-primary hover:underline">Log in</a>
    </p>
  </div>
</div>
