# TODO

Incomplete features and known gaps found during a full code review, with the minimal
steps to finish each. Ordered roughly by impact. Items are removed once implemented.

Things that are merely _not started yet_ (maps, real-time collab, custom entity types,
importers) live in `IDEAS.md`. This file is for things that are half-built, wired up
but non-functional, or documented as working when they are not.

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
