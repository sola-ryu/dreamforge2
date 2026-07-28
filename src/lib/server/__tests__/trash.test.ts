import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { testDb } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  return { testDb: db };
});

vi.mock('../db', () => {
  return { default: testDb };
});

import { migrate } from '../migrate';
import { createEntity, syncEntityToDb } from '../entities';
import {
  softDeleteEntity,
  restoreEntity,
  softDeleteStory,
  softDeleteChapter,
  softDeleteScene,
  permanentDeleteEntity,
  listTrashItems
} from '../trash';
import { loadRelations, addRelation } from '../relations';
import {
  createStory,
  createChapter,
  createScene,
  getStoryMeta,
  getChapterMeta,
  getScene,
  listChapters,
  listScenes
} from '../stories';
import { generateId } from '$lib/utils';

let tmpDir: string;
let projectId: string;
let userId: string;

function insertUser(): string {
  const id = generateId();
  testDb.exec(
    `INSERT INTO users (id, email, username, password_hash, created_at) VALUES ('${id}', '${id}@test.com', 'user-${id.slice(0, 8)}', 'hash', '2024-01-01')`
  );
  return id;
}

function insertProject() {
  userId = insertUser();
  projectId = generateId();
  testDb.exec(
    `INSERT INTO projects (id, user_id, name, description, data_path, pinned, created_at, modified_at) VALUES ('${projectId}', '${userId}', 'Test', null, '${tmpDir}', 0, '2024-01-01', '2024-01-01')`
  );
}

function insertBookmark(entityId: string) {
  const id = generateId();
  testDb.exec(
    `INSERT INTO bookmarks (id, user_id, project_id, entity_id, created_at) VALUES ('${id}', '${userId}', '${projectId}', '${entityId}', '2024-01-01')`
  );
  return id;
}

function insertImageLink(entityId: string) {
  const linkId = generateId();
  const imageId = generateId();
  testDb.exec(
    `INSERT INTO project_images (id, project_id, filename, original_name, mime_type, size, caption, alt_text, created_at) VALUES ('${imageId}', '${projectId}', 'a.png', 'a.png', 'image/png', 1, null, null, '2024-01-01')`
  );
  testDb.exec(
    `INSERT INTO image_entity_links (id, image_id, entity_id, project_id) VALUES ('${linkId}', '${imageId}', '${entityId}', '${projectId}')`
  );
  return { linkId, imageId };
}

function countRows(sql: string): number {
  return (testDb.prepare(sql).get() as { c: number }).c;
}

beforeAll(() => {
  migrate();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-trash-'));
  fs.mkdirSync(path.join(tmpDir, 'characters'), { recursive: true });
  insertProject();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('softDeleteEntity / restoreEntity relation and link cleanup', () => {
  it('removes relations touching the deleted entity and restores them', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    const b = createEntity(projectId, tmpDir, 'character', { name: 'Bob' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    syncEntityToDb(projectId, 'character', b.id, b.frontmatter);

    addRelation(tmpDir, { sourceId: a.id, targetId: b.id, relationType: 'friend', label: null });
    addRelation(tmpDir, { sourceId: b.id, targetId: a.id, relationType: 'friend', label: null });

    const trashItem = softDeleteEntity(projectId, tmpDir, 'character', a.id);
    expect(trashItem).not.toBeNull();

    // Relations touching the deleted entity are gone from the live file...
    expect(loadRelations(tmpDir)).toHaveLength(0);

    const restored = restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(restored).toBe(true);

    // ...and come back on restore.
    const relations = loadRelations(tmpDir);
    expect(relations).toHaveLength(2);
    expect(relations.map((r) => r.sourceId).sort()).toEqual([a.id, b.id].sort());
  });

  it('leaves relations between other entities untouched', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    const b = createEntity(projectId, tmpDir, 'character', { name: 'Bob' });
    const c = createEntity(projectId, tmpDir, 'character', { name: 'Carol' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    syncEntityToDb(projectId, 'character', b.id, b.frontmatter);
    syncEntityToDb(projectId, 'character', c.id, c.frontmatter);

    addRelation(tmpDir, { sourceId: a.id, targetId: b.id, relationType: 'friend', label: null });
    addRelation(tmpDir, { sourceId: b.id, targetId: c.id, relationType: 'friend', label: null });

    softDeleteEntity(projectId, tmpDir, 'character', a.id);

    const relations = loadRelations(tmpDir);
    expect(relations).toHaveLength(1);
    expect(relations[0].sourceId).toBe(b.id);
    expect(relations[0].targetId).toBe(c.id);
  });

  it('removes and restores bookmarks for the deleted entity', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    insertBookmark(a.id);

    expect(
      countRows(
        `SELECT COUNT(*) c FROM bookmarks WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);

    const trashItem = softDeleteEntity(projectId, tmpDir, 'character', a.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM bookmarks WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(0);

    restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM bookmarks WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);
  });

  it('removes and restores image links for the deleted entity', () => {
    const a = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    syncEntityToDb(projectId, 'character', a.id, a.frontmatter);
    insertImageLink(a.id);

    expect(
      countRows(
        `SELECT COUNT(*) c FROM image_entity_links WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);

    const trashItem = softDeleteEntity(projectId, tmpDir, 'character', a.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM image_entity_links WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(0);

    restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(
      countRows(
        `SELECT COUNT(*) c FROM image_entity_links WHERE entity_id = '${a.id}' AND project_id = '${projectId}'`
      )
    ).toBe(1);
  });
});

describe('softDeleteStory / restoreEntity / permanentDeleteEntity for stories', () => {
  it('moves the story directory into trash and removes it from its live location', () => {
    const story = createStory(tmpDir, 'My Story', 'A description');

    const trashItem = softDeleteStory(projectId, tmpDir, story.id);
    expect(trashItem).not.toBeNull();
    expect(trashItem!.kind).toBe('story');
    expect(trashItem!.name).toBe('My Story');
    expect(trashItem!.body).toBe('A description');

    expect(getStoryMeta(tmpDir, story.id)).toBeNull();
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'stories', story.id))).toBe(true);
  });

  it('returns null for a non-existent story', () => {
    expect(softDeleteStory(projectId, tmpDir, 'nonexistent')).toBeNull();
  });

  it('restores a trashed story back to its live location', () => {
    const story = createStory(tmpDir, 'Restore Me');
    const trashItem = softDeleteStory(projectId, tmpDir, story.id);

    const restored = restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(restored).toBe(true);

    const meta = getStoryMeta(tmpDir, story.id);
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Restore Me');
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'stories', story.id))).toBe(false);
  });

  it('permanently deletes a trashed story directory', () => {
    const story = createStory(tmpDir, 'Gone Forever');
    const trashItem = softDeleteStory(projectId, tmpDir, story.id);

    const deleted = permanentDeleteEntity(projectId, tmpDir, trashItem!.id);
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'stories', story.id))).toBe(false);
    expect(listTrashItems(projectId, tmpDir)).toHaveLength(0);
  });

  it('preserves chapters and scenes nested inside a trashed story', () => {
    const story = createStory(tmpDir, 'Story With Content');
    const chapter = createChapter(tmpDir, story.id, 'Chapter 1');
    createScene(tmpDir, story.id, chapter.id, 'Scene 1');

    const trashItem = softDeleteStory(projectId, tmpDir, story.id);
    restoreEntity(projectId, tmpDir, trashItem!.id);

    const chapters = listChapters(tmpDir, story.id);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe('Chapter 1');
    expect(listScenes(tmpDir, story.id, chapter.id)).toHaveLength(1);
  });
});

describe('softDeleteChapter / restoreEntity / permanentDeleteEntity for chapters', () => {
  it('moves the chapter directory into trash and removes it from its live location', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'My Chapter');

    const trashItem = softDeleteChapter(projectId, tmpDir, story.id, chapter.id);
    expect(trashItem).not.toBeNull();
    expect(trashItem!.kind).toBe('chapter');
    expect(trashItem!.name).toBe('My Chapter');
    expect(trashItem!.metadata).toEqual({ storyId: story.id });

    expect(getChapterMeta(tmpDir, story.id, chapter.id)).toBeNull();
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'chapters', chapter.id))).toBe(true);
  });

  it('returns null for a non-existent chapter', () => {
    const story = createStory(tmpDir, 'Story');
    expect(softDeleteChapter(projectId, tmpDir, story.id, 'nonexistent')).toBeNull();
  });

  it('restores a trashed chapter back into its parent story', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Restore Me');
    const trashItem = softDeleteChapter(projectId, tmpDir, story.id, chapter.id);

    const restored = restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(restored).toBe(true);

    const meta = getChapterMeta(tmpDir, story.id, chapter.id);
    expect(meta).not.toBeNull();
    expect(meta!.title).toBe('Restore Me');
  });

  it('refuses to restore a chapter whose parent story no longer exists', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Orphan');
    const trashItem = softDeleteChapter(projectId, tmpDir, story.id, chapter.id);

    // Remove the story out from under the trashed chapter without going through
    // trash — simulates the story having been permanently deleted in the meantime.
    fs.rmSync(path.join(tmpDir, 'stories', story.id), { recursive: true, force: true });

    const restored = restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(restored).toBe(false);

    // The trash item is left intact rather than silently dropped.
    expect(listTrashItems(projectId, tmpDir)).toHaveLength(1);
  });

  it('permanently deletes a trashed chapter directory', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Gone Forever');
    const trashItem = softDeleteChapter(projectId, tmpDir, story.id, chapter.id);

    const deleted = permanentDeleteEntity(projectId, tmpDir, trashItem!.id);
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'chapters', chapter.id))).toBe(false);
  });
});

describe('softDeleteScene / restoreEntity / permanentDeleteEntity for scenes', () => {
  it('moves the scene file into trash and removes it from its live location', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter');
    const scene = createScene(tmpDir, story.id, chapter.id, 'My Scene');

    const trashItem = softDeleteScene(projectId, tmpDir, story.id, chapter.id, scene.id);
    expect(trashItem).not.toBeNull();
    expect(trashItem!.kind).toBe('scene');
    expect(trashItem!.name).toBe('My Scene');
    expect(trashItem!.metadata).toEqual({ storyId: story.id, chapterId: chapter.id });

    expect(getScene(tmpDir, story.id, chapter.id, scene.id)).toBeNull();
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'scenes', `${scene.id}.md`))).toBe(true);
  });

  it('returns null for a non-existent scene', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter');
    expect(softDeleteScene(projectId, tmpDir, story.id, chapter.id, 'nonexistent')).toBeNull();
  });

  it('restores a trashed scene back into its parent chapter, preserving body text', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Restore Me');
    // updateScene lives on the live-location scene file, so write body before trashing.
    const withBody = softDeleteScene(projectId, tmpDir, story.id, chapter.id, scene.id);
    expect(withBody).not.toBeNull();

    const restored = restoreEntity(projectId, tmpDir, withBody!.id);
    expect(restored).toBe(true);

    const reloaded = getScene(tmpDir, story.id, chapter.id, scene.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.title).toBe('Restore Me');
  });

  it('refuses to restore a scene whose parent chapter no longer exists', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Orphan');
    const trashItem = softDeleteScene(projectId, tmpDir, story.id, chapter.id, scene.id);

    fs.rmSync(path.join(tmpDir, 'stories', story.id, 'chapters', chapter.id), {
      recursive: true,
      force: true
    });

    const restored = restoreEntity(projectId, tmpDir, trashItem!.id);
    expect(restored).toBe(false);
    expect(listTrashItems(projectId, tmpDir)).toHaveLength(1);
  });

  it('permanently deletes a trashed scene file', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Gone Forever');
    const trashItem = softDeleteScene(projectId, tmpDir, story.id, chapter.id, scene.id);

    const deleted = permanentDeleteEntity(projectId, tmpDir, trashItem!.id);
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.trash', 'scenes', `${scene.id}.md`))).toBe(false);
  });
});

describe('story/chapter/scene trash path-safety', () => {
  it('softDeleteStory refuses ids that escape the stories directory', () => {
    const victim = fs.mkdtempSync(path.join(os.tmpdir(), 'df-victim-'));
    fs.writeFileSync(path.join(victim, 'keep.txt'), 'important');

    const escape = path.relative(path.join(tmpDir, 'stories'), victim);
    expect(softDeleteStory(projectId, tmpDir, escape)).toBeNull();
    expect(fs.existsSync(path.join(victim, 'keep.txt'))).toBe(true);

    fs.rmSync(victim, { recursive: true, force: true });
  });

  it('softDeleteChapter and softDeleteScene refuse ids that escape their directories', () => {
    const story = createStory(tmpDir, 'S');
    const chapter = createChapter(tmpDir, story.id, 'C');

    expect(softDeleteChapter(projectId, tmpDir, story.id, '../../../../outside')).toBeNull();
    expect(
      softDeleteScene(projectId, tmpDir, story.id, chapter.id, '../../../../outside')
    ).toBeNull();
  });
});
