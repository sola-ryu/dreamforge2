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
import { createEntity, ENTITY_DIRS } from '../entities';
import { searchProjectContent } from '../search';
import { createStory, createChapter, createScene, updateScene } from '../stories';
import { generateId } from '$lib/utils';

let tmpDir: string;
let projectId: string;

function createProjectDirs(basePath: string) {
  for (const dir of Object.values(ENTITY_DIRS)) {
    fs.mkdirSync(path.join(basePath, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(basePath, 'notes', '_project'), { recursive: true });
  fs.mkdirSync(path.join(basePath, 'stories'), { recursive: true });
}

function insertProjectRow(dataPath: string): string {
  const userId = generateId();
  const id = generateId();
  testDb.exec(
    `INSERT INTO users (id, email, username, password_hash, created_at) VALUES ('${userId}', '${userId}@test.com', 'user-${userId.slice(0, 8)}', 'hash', '2024-01-01')`
  );
  testDb.exec(
    `INSERT INTO projects (id, user_id, name, description, data_path, pinned, created_at, modified_at) VALUES ('${id}', '${userId}', 'Test', null, '${dataPath}', 0, '2024-01-01', '2024-01-01')`
  );
  return id;
}

beforeAll(() => {
  migrate();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-search-'));
  createProjectDirs(tmpDir);
  projectId = insertProjectRow(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('searchProjectContent', () => {
  it('returns nothing for an empty query', () => {
    createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    expect(searchProjectContent(projectId, tmpDir, '')).toEqual([]);
    expect(searchProjectContent(projectId, tmpDir, '   ')).toEqual([]);
  });

  it('matches on name', () => {
    createEntity(projectId, tmpDir, 'character', { name: 'Alice Wonderland' });
    createEntity(projectId, tmpDir, 'character', { name: 'Bob' });

    const results = searchProjectContent(projectId, tmpDir, 'wonder');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alice Wonderland');
    expect(results[0].matchedIn).toBe('name');
    expect(results[0].snippet).toBeNull();
  });

  it('matches on body text and returns a snippet', () => {
    createEntity(projectId, tmpDir, 'character', {
      name: 'Alice',
      body: 'A curious girl who fell down a rabbit hole into a strange world.'
    });

    const results = searchProjectContent(projectId, tmpDir, 'rabbit hole');
    expect(results).toHaveLength(1);
    expect(results[0].matchedIn).toBe('body');
    expect(results[0].snippet).toContain('rabbit hole');
  });

  it('matches on custom frontmatter field values', () => {
    createEntity(projectId, tmpDir, 'character', {
      name: 'Alice',
      motivations: 'Find her way back home before the tea gets cold'
    });

    const results = searchProjectContent(projectId, tmpDir, 'tea gets cold');
    expect(results).toHaveLength(1);
    expect(results[0].matchedIn).toBe('field');
    expect(results[0].snippet).toContain('tea gets cold');
  });

  it('matches on array-valued frontmatter fields (e.g. tags-type custom fields)', () => {
    createEntity(projectId, tmpDir, 'character', {
      name: 'Alice',
      traits: ['curious', 'brave', 'polite']
    });

    const results = searchProjectContent(projectId, tmpDir, 'brave');
    expect(results).toHaveLength(1);
    expect(results[0].matchedIn).toBe('field');
  });

  it('is case-insensitive', () => {
    createEntity(projectId, tmpDir, 'character', { name: 'Alice', body: 'A White Rabbit ran by.' });
    expect(searchProjectContent(projectId, tmpDir, 'WHITE RABBIT')).toHaveLength(1);
  });

  it('does not match on structural frontmatter keys like id/slug/status', () => {
    const entity = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    // The entity id itself should not be treated as searchable content.
    expect(searchProjectContent(projectId, tmpDir, entity.id)).toEqual([]);
  });

  it('respects an entity type filter', () => {
    createEntity(projectId, tmpDir, 'character', { name: 'Shared Name' });
    createEntity(projectId, tmpDir, 'location', { name: 'Shared Name' });

    const results = searchProjectContent(projectId, tmpDir, 'Shared', { typeFilter: 'location' });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('location');
  });

  it('does not cross-match another project sharing the same query', () => {
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-search-other-'));
    createProjectDirs(otherDir);
    const otherProjectId = insertProjectRow(otherDir);
    createEntity(otherProjectId, otherDir, 'character', { name: 'Alice From Elsewhere' });

    createEntity(projectId, tmpDir, 'character', { name: 'Alice Here' });

    const results = searchProjectContent(projectId, tmpDir, 'Alice');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alice Here');

    fs.rmSync(otherDir, { recursive: true, force: true });
  });

  it('sorts results by most recently modified first', async () => {
    createEntity(projectId, tmpDir, 'character', { name: 'Older Match' });
    await new Promise((r) => setTimeout(r, 5));
    createEntity(projectId, tmpDir, 'character', { name: 'Newer Match' });

    const results = searchProjectContent(projectId, tmpDir, 'Match');
    expect(results.map((r) => r.name)).toEqual(['Newer Match', 'Older Match']);
  });
});

describe('searchProjectContent — scenes', () => {
  function makeScene(title: string, body: string, summary?: string) {
    const story = createStory(tmpDir, 'The Long Road');
    const chapter = createChapter(tmpDir, story.id, 'Departure');
    const scene = createScene(tmpDir, story.id, chapter.id, title);
    updateScene(tmpDir, story.id, chapter.id, scene.id, { body, summary: summary || null });
    return { story, chapter, scene };
  }

  it('matches scene body text and links back to the scene', () => {
    const { story, scene } = makeScene('Leaving', 'The lantern guttered in the wind.');

    const results = searchProjectContent(projectId, tmpDir, 'lantern');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: 'scene', id: scene.id, matchedIn: 'body' });
    expect(results[0].context).toBe('The Long Road › Departure');
    expect(results[0].href).toBe(`/projects/${projectId}/stories/${story.id}?scene=${scene.id}`);
    expect(results[0].snippet).toContain('lantern');
  });

  it('matches a scene title and a scene summary', () => {
    makeScene('The Crossing', 'nothing relevant', 'They ford the river at dusk.');

    expect(searchProjectContent(projectId, tmpDir, 'Crossing')[0].matchedIn).toBe('name');
    expect(searchProjectContent(projectId, tmpDir, 'ford the river')[0].matchedIn).toBe('summary');
  });

  it('names an untitled scene by position', () => {
    const story = createStory(tmpDir, 'Untitled');
    const chapter = createChapter(tmpDir, story.id, 'One');
    const scene = createScene(tmpDir, story.id, chapter.id);
    updateScene(tmpDir, story.id, chapter.id, scene.id, { body: 'a distinctive phrase' });

    expect(searchProjectContent(projectId, tmpDir, 'distinctive')[0].name).toBe('Scene 1');
  });

  it('returns entities and scenes together, newest first', async () => {
    makeScene('Leaving', 'a shared keyword here');
    await new Promise((r) => setTimeout(r, 5));
    createEntity(projectId, tmpDir, 'character', {
      name: 'Keyword Holder',
      body: 'shared keyword'
    });

    const results = searchProjectContent(projectId, tmpDir, 'shared keyword');
    expect(results.map((r) => r.kind)).toEqual(['entity', 'scene']);
  });

  it('can be limited to one kind', () => {
    makeScene('Leaving', 'a shared keyword here');
    createEntity(projectId, tmpDir, 'character', {
      name: 'Keyword Holder',
      body: 'shared keyword'
    });

    expect(
      searchProjectContent(projectId, tmpDir, 'shared keyword', { kind: 'scene' }).map(
        (r) => r.kind
      )
    ).toEqual(['scene']);
    expect(
      searchProjectContent(projectId, tmpDir, 'shared keyword', { kind: 'entity' }).map(
        (r) => r.kind
      )
    ).toEqual(['entity']);
  });
});
