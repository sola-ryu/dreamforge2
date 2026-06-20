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
import { noteToScene, sceneToNote } from '../conversion';
import { createEntity, getEntity } from '../entities';
import {
  createStory,
  createChapter,
  createScene,
  updateScene,
  getScene,
  listScenes,
  listChapters
} from '../stories';
import { generateId } from '$lib/utils';

let tmpDir: string;
let TEST_PROJECT_ID: string;

function setupProject() {
  TEST_PROJECT_ID = generateId();
  const userId = generateId();
  const username = `user-${userId.slice(0, 8)}`;
  testDb.exec(
    `INSERT INTO users (id, email, username, password_hash, created_at) VALUES ('${userId}', '${userId}@test.com', '${username}', 'hash', '2024-01-01')`
  );
  testDb.exec(
    `INSERT INTO projects (id, user_id, name, description, data_path, pinned, created_at, modified_at) VALUES ('${TEST_PROJECT_ID}', '${userId}', 'Test', null, '${tmpDir}', 0, '2024-01-01', '2024-01-01')`
  );

  for (const dir of ['characters', 'locations', 'notes/_project']) {
    fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(tmpDir, 'stories'), { recursive: true });
}

beforeAll(() => {
  migrate();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-conv-'));
  setupProject();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('noteToScene', () => {
  it('returns null when note does not exist', () => {
    const result = noteToScene(TEST_PROJECT_ID, tmpDir, 'nonexistent', 'story-1', null);
    expect(result).toBeNull();
  });

  it('creates a scene from a note', () => {
    const note = createEntity(TEST_PROJECT_ID, tmpDir, 'note', {
      name: 'Battle Scene Idea',
      body: 'The hero fights the dragon on the mountain.',
      tags: ['action']
    });

    const story = createStory(tmpDir, 'My Story');
    const chapter = createChapter(tmpDir, story.id, 'Chapter 1');

    const scene = noteToScene(TEST_PROJECT_ID, tmpDir, note.id, story.id, chapter.id);
    expect(scene).not.toBeNull();
    expect(scene!.title).toBe('Battle Scene Idea');

    const saved = getScene(tmpDir, story.id, chapter.id, scene!.id);
    expect(saved).not.toBeNull();
    expect(saved!.body).toContain('The hero fights the dragon');
  });

  it('archives the note after conversion', () => {
    const note = createEntity(TEST_PROJECT_ID, tmpDir, 'note', {
      name: 'Convert Me',
      body: 'Content'
    });
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');

    noteToScene(TEST_PROJECT_ID, tmpDir, note.id, story.id, chapter.id);

    const archived = getEntity(TEST_PROJECT_ID, tmpDir, 'note', note.id);
    expect(archived).not.toBeNull();
    expect(archived!.status).toBe('archived');
    expect(archived!.frontmatter.convertedTo).toBeTruthy();
  });

  it('creates a new chapter when chapterId is null and no chapters exist', () => {
    const note = createEntity(TEST_PROJECT_ID, tmpDir, 'note', {
      name: 'New Chapter Note',
      body: 'Body'
    });
    const story = createStory(tmpDir, 'Story');

    noteToScene(TEST_PROJECT_ID, tmpDir, note.id, story.id, null, 'From Notes');

    const chapters = listChapters(tmpDir, story.id);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe('From Notes');
  });

  it('uses first chapter when chapterId is null and chapters exist', () => {
    const note = createEntity(TEST_PROJECT_ID, tmpDir, 'note', {
      name: 'Use First Chapter',
      body: 'Body'
    });
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'First Chapter');

    noteToScene(TEST_PROJECT_ID, tmpDir, note.id, story.id, null);

    const scenes = listScenes(tmpDir, story.id, chapter.id);
    expect(scenes).toHaveLength(1);
  });
});

describe('sceneToNote', () => {
  it('returns null when scene does not exist', () => {
    const result = sceneToNote(TEST_PROJECT_ID, tmpDir, 'story-1', 'chapter-1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('creates a note from a scene', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Dragon Fight');
    updateScene(tmpDir, story.id, chapter.id, scene.id, { body: 'The hero fights the dragon.' });

    const note = sceneToNote(TEST_PROJECT_ID, tmpDir, story.id, chapter.id, scene.id);
    expect(note).not.toBeNull();
    expect(note!.name).toBe('Dragon Fight');

    const entity = getEntity(TEST_PROJECT_ID, tmpDir, 'note', note!.id);
    expect(entity).not.toBeNull();
    expect(entity!.body).toContain('dragon');
    expect(entity!.status).toBe('draft');
  });

  it('marks the scene as converted', () => {
    const story = createStory(tmpDir, 'Story');
    const chapter = createChapter(tmpDir, story.id, 'Ch 1');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Scene');

    sceneToNote(TEST_PROJECT_ID, tmpDir, story.id, chapter.id, scene.id);

    const updated = getScene(tmpDir, story.id, chapter.id, scene.id);
    expect(updated!.body).toContain('Converted to note');
  });
});
