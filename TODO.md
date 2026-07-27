# TODO

Incomplete features and known gaps found during a full code review, with the minimal
steps to finish each. Ordered roughly by impact. Items are removed once implemented.

Things that are merely _not started yet_ (maps, real-time collab, custom entity types,
importers) live in `IDEAS.md`. This file is for things that are half-built, wired up
but non-functional, or documented as working when they are not.

---

## 1. Project rename / delete / description editing

**Status:** No way to delete a project, ever. Settings page loads `project` but has no
action to change its name or description. `projects/+page.server.ts` only has `create`
and `togglePin`.

**Files:** `src/routes/projects/[id]/settings/+page.server.ts`, `+page.svelte`

**Steps:**

1. Add an `updateProject` action (owner only): update `name`/`description` on the
   `projects` row and rewrite `project.json` in `project.dataPath`.
2. Add a `deleteProject` action (owner only). Delete in this order so foreign keys hold:
   `comments`, `bookmarks`, `image_entity_links`, `project_images`, `custom_field_defs`,
   `project_members`, `trash_items`, `entities`, then the `projects` row.
3. Call `unwatchProject(projectId)` (already exported from `watcher.ts`, currently unused)
   before removing the directory, then `fs.rmSync(project.dataPath, { recursive: true })`.
4. Add the form + a type-the-name-to-confirm dialog in `settings/+page.svelte`.

---

## 2. Plot beats cannot be created, renamed, or deleted

**Status:** Beats only ever come from a template (`plotTemplates.ts`). A plotline created
with no template gets `beats: []` and there is no UI or action to add one, so the page is
permanently empty. Only `linkScene` and `reorderBeats` exist.

**Files:** `src/routes/projects/[id]/plots/[plotlineId]/+page.server.ts`, `+page.svelte`,
`src/lib/server/plots.ts`

**Steps:**

1. Add `addBeat` / `renameBeat` / `deleteBeat` actions that read the plotline, mutate
   `beats`, and call `updatePlotline`.
2. **Give beats a stable `id`.** They are currently keyed by `title`, so two beats with
   the same title break `linkScene` and `reorderBeats` (both match). Add `id: string` to
   the `PlotBeat` interface, generate it with `generateId()`, and switch `linkScene` /
   `reorderBeats` to match on `id`. Backfill ids on read for existing plotline JSON.
3. Add the corresponding buttons to `PlotTimeline.svelte`.

---

## 3. Search only matches entity names

**Status:** README says "Global search across all content". `searchEntities` runs
`like(entities.name, '%q%')` against the SQLite index only — it never looks at body text,
frontmatter fields, tags, scenes, or notes' content.

**Files:** `src/lib/server/entities.ts` (`searchEntities`),
`src/routes/projects/[id]/search/+page.server.ts`

**Steps (minimal):**

1. In the search loader, after `scanProject`, also call `listEntities` per type and filter
   on `body` + `frontmatter` values in memory. Fine up to a few thousand entities.
2. Return a match snippet (±60 chars around the hit) so results are useful.
3. Either extend the scope to scenes via `listStories`/`listChapters`/`listScenes`, or
   narrow the README claim to "search across entities".

**Steps (proper, if entity counts grow):** add an FTS5 virtual table in `migrate.ts`
(`entities_fts(name, body, tags)`), populate it from `syncEntityToDb`/`scanProject`, and
query it with `MATCH`.

---

## 4. Relations are not cleaned up when an entity is deleted

**Status:** Relations live in `relations.json`. Deleting an entity (soft delete to trash)
leaves relations pointing at the missing id. `RelationGraph` silently filters them out, so
the edges are invisible but permanently present in the file, and they reappear wrong if a
different entity is later restored.

**Files:** `src/lib/server/trash.ts`, `src/routes/projects/[id]/relations/+page.server.ts`

**Steps:**

1. Move `loadRelations`/`saveRelations` out of the relations route into
   `src/lib/server/relations.ts` so other modules can use them.
2. In `softDeleteEntity`, drop relations touching the entity id and stash them in the
   trash row's `metadata` column (it already exists and is unused for entities).
3. In `restoreEntity`, re-add the stashed relations.
4. Also clear `image_entity_links` and `bookmarks` rows for the deleted entity id.

---

## 5. Stories / chapters / scenes are deleted permanently

**Status:** Entities go to `.trash` with a 30-day TTL and a restore UI. Stories, chapters,
and scenes call `fs.rmSync` / `fs.unlinkSync` directly — one misclick is unrecoverable.

**Files:** `src/lib/server/stories.ts`, `src/lib/server/trash.ts`

**Steps:**

1. Add `kind: 'story' | 'chapter' | 'scene'` to the trash `kind` column (no migration
   needed, it is a free-text column with a default).
2. Move the directory/file into `.trash/stories/<id>/` instead of removing it, and insert
   a trash row with the story/chapter path recorded in `metadata`.
3. Extend `restoreEntity` and `permanentDeleteEntity` in `trash.ts` with the new kinds,
   and render them in `trash/+page.svelte`.

---

## 6. Unused `stories` / `chapters` / `scenes` / `tags` DB tables

**Status:** `migrate.ts` creates them and `schema.ts` declares them, but story data is
100% file-based and nothing reads or writes these four tables. Dead weight that misleads
anyone reading the schema, and it means stories are invisible to any query-based feature
(including search, item 3).

**Files:** `src/lib/server/migrate.ts`, `src/lib/server/schema.ts`

**Steps — pick one:**

- **Remove:** delete the four `sqliteTable` declarations and their `CREATE TABLE`
  statements. Leave existing DBs alone (`CREATE TABLE IF NOT EXISTS` just stops running).
- **Or use:** index stories/chapters/scenes from `scanProject` the same way entities are,
  which also unblocks searching scene text.

The `tags` table is unused either way — entity tags live in frontmatter and in the
`entities.tags` JSON column. Remove it.

---

## 7. Watcher never indexes scenes or chapters

**Status:** `handleSceneFileChange` and `handleChapterFileChange` in `watcher.ts` are
empty stubs with the comment "Will be implemented when scenes module is built". The scenes
module has been built.

**Files:** `src/lib/server/watcher.ts`

**Steps:** depends on item 6. If the tables stay, parse the file and upsert into
`scenes`/`chapters`; if they go, delete the two stubs and the branches that call them.

---

## 9. Dead mention code

**Status:** `src/lib/components/MentionList.svelte`, `src/lib/components/MentionHover.svelte`,
and `src/lib/extensions/Mention.ts` are not imported anywhere. `Editor.svelte` hand-rolls
the mention dropdown with `innerHTML` and does hover cards inline. `IDEAS.md` still lists
"@Mentions with Hover Cards" as unimplemented even though a working version ships.

**Steps:** either delete the three dead files, or replace the `innerHTML` dropdown in
`Editor.svelte` with `MentionList.svelte` rendered via `mount()` (nicer: no manual HTML
escaping needed). Then drop the @Mentions section from `IDEAS.md`.

---

## 10. Mentions are not persisted as links

**Status:** `IDEAS.md` specifies mentions should round-trip through Markdown as
`[@Name](mention://character/<id>)` and be re-hydrated on load. Today the Tiptap mention
node is serialized by `@tiptap/markdown` with no custom rule, so the entity id is lost on
save — the mention degrades to plain text and the hover card stops resolving.

**Files:** `src/lib/components/Editor.svelte`

**Steps:**

1. Extend the configured `Mention` node with `renderMarkdown` (or a `Markdown` serializer
   rule) emitting `[@${label}](mention://${type}/${id})`.
2. Add a matching `parseMarkdown` input rule so the link form is read back into a mention
   node on load.
3. Add a round-trip unit test: mention node → markdown → mention node.

---

## 11. Scene frontmatter is not escaped

**Status:** `createScene` / `updateScene` in `stories.ts` build YAML by string
concatenation (`title: ${updated.title || ''}`), and `listScenes` parses it back with
`/^(\w+):\s*(.*)$/`. A scene title, summary, narrator, time, or place containing a newline
corrupts the file; everything after the newline is silently swallowed or misparsed as
another key. Entities do not have this problem — they go through `markdown.ts`.

**Files:** `src/lib/server/stories.ts`, `src/lib/server/markdown.ts`

**Steps:**

1. Replace the hand-built template strings in `createScene`, `updateScene`,
   `createChapter`, and `updateChapter` with `serializeMarkdown()` from `markdown.ts`,
   which already JSON-quotes multiline strings.
2. Replace the regex parsing in `listScenes` and `getChapterMeta` with `parseMarkdown()`.
3. Keep reading the old format: `parseMarkdown` already handles plain `key: value` lines,
   so existing files continue to load unchanged.
4. Add a test writing a scene with a multi-line summary and reading it back.

---

## 13. Module-level Svelte state is shared across SSR requests

**Status:** `theme.svelte.ts`, `compactMode.svelte.ts`, and `zenMode.svelte.ts` declare
`$state` at module scope. On the server that module is a singleton shared by every
concurrent request, so one user's zen/compact toggle can bleed into another user's
server-rendered HTML. Only mild today because all three are toggled client-side, but it is
a real cross-request leak.

**Files:** `src/lib/stores/*.svelte.ts`, `src/routes/+layout.svelte`

**Steps:** convert each to the context pattern — `setContext(KEY, createXState())` in
`+layout.svelte`, `getContext(KEY)` in consumers — so each request gets its own instance.

---

## 14. Compact mode is not wired to anything

**Status:** `src/lib/stores/compactMode.svelte.ts` exports `getCompactMode()` with a
`toggle()`, and nothing imports it. There is no toggle control and no styles react to it.

**Steps:** either delete the store, or add a sidebar toggle plus a `compact` class on the
layout wrapper with the corresponding density rules in `app.css`.

---

## 15. Docs drift

**Files:** `README.md`, `AGENTS.md`

- README lists "Light / dark / monochrome themes" — `Theme` is `'light' | 'dark'`, there is
  no monochrome theme. Either add one or drop it from the list.
- README lists "Relation graph (force-directed with d3.js)" and AGENTS.md says
  `projects/[id]/relations/ — Force-directed graph (d3)`. It uses **cytoscape** with
  fcose/avsdf layouts; d3 is not a dependency.
- AGENTS.md says "Tailwind CSS v3" — `package.json` has `tailwindcss@^4.3.1`.
- AGENTS.md says "Do NOT remove or change archiver v7 — v8 removed the default function
  export". The project is already on archiver v8 and uses the `ZipArchive` named export.
  Update the note so nobody downgrades it back.
- AGENTS.md says "Images are base64-encoded to avoid serving from disk". They are stored
  on disk under `<project>/images/` and streamed by `api/projects/[id]/images/[file]`.
- AGENTS.md's structure listing omits `plots/`, `timelines/`, `trash/`, `images/`, and
  `settings/`.
