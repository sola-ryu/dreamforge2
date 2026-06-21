<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toggleTheme } from '$lib/stores/theme.svelte';
  import { getZenMode } from '$lib/stores/zenMode.svelte';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import {
    Home,
    BookMarked,
    SunMoon,
    LogOut,
    Download,
    Search,
    Clock,
    LayoutDashboard,
    BookOpenText,
    GitBranch,
    Scan
  } from 'lucide-svelte';

  const zen = getZenMode();
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          size="lg"
          class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <span class="text-sm font-semibold">DF</span>
          </div>
          <span class="truncate font-semibold">DreamForge</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>General</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton
              isActive={$page.url.pathname === '/projects'}
              onclick={() => goto('/projects')}
              tooltipContent="Projects"
            >
              <Home class="h-4 w-4" />
              <span>Projects</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if $page.params?.id}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Current Project</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={$page.url.pathname === `/projects/${$page.params.id}`}
                onclick={() => goto(`/projects/${$page.params.id}`)}
                tooltipContent="Dashboard"
              >
                <LayoutDashboard class="h-4 w-4" />
                <span>Dashboard</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                onclick={() => goto(`/projects/${$page.params.id}/stories`)}
                tooltipContent="Stories"
              >
                <BookOpenText class="h-4 w-4" />
                <span>Stories</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                onclick={() => goto(`/projects/${$page.params.id}/timelines`)}
                tooltipContent="Timelines"
              >
                <Clock class="h-4 w-4" />
                <span>Timelines</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                onclick={() => goto(`/projects/${$page.params.id}/relations`)}
                tooltipContent="Relations"
              >
                <GitBranch class="h-4 w-4" />
                <span>Relations</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>

            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                onclick={() => goto(`/projects/${$page.params.id}/search`)}
                tooltipContent="Search"
              >
                <Search class="h-4 w-4" />
                <span>Search</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>

      {#if $page.data?.bookmarks?.length > 0}
        <Sidebar.Group>
          <Sidebar.GroupLabel>
            <div class="flex items-center gap-2">
              <BookMarked class="h-3 w-3" />
              Bookmarks
            </div>
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each $page.data.bookmarks as bm (bm.entityId)}
                <Sidebar.MenuItem>
                  <Sidebar.MenuButton
                    onclick={() => goto(`/projects/${$page.params.id}/${bm.entityType}s/${bm.entityId}`)}
                    tooltipContent={bm.entityName || bm.entityId}
                  >
                    <span class="truncate">{bm.entityName || bm.entityId}</span>
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      {/if}
    {/if}
  </Sidebar.Content>

  <Sidebar.Footer>
    <Sidebar.Menu>
      {#if $page.params?.id}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton tooltipContent="Export Project">
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <a href="/projects/{$page.params.id}/export" {...props} target="_blank">
                <Download class="h-4 w-4" />
                <span>Export Project</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/if}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton onclick={toggleTheme} tooltipContent="Toggle Theme">
          <SunMoon class="h-4 w-4" />
          <span>Toggle Theme</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          onclick={() => zen.toggle()}
          tooltipContent={zen.active ? 'Exit Zen Mode' : 'Zen Mode'}
        >
          <Scan class="h-4 w-4" />
          <span>{zen.active ? 'Exit Zen Mode' : 'Zen Mode'}</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          onclick={() => goto('/logout')}
          tooltipContent="Log Out"
        >
          <LogOut class="h-4 w-4" />
          <span>Log Out</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>

  <Sidebar.Rail />
</Sidebar.Root>
