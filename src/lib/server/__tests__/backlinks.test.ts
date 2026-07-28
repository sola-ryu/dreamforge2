import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { testDb } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  return { testDb: new Database(':memory:') };
});

vi.mock('../db', () => ({ default: testDb }));

import { migrate } from '../migrate';
import { getBacklinks, mentionsEntity } from '../backlinks';
import { createEntity, updateEntity, ENTITY_DIRS } from '../entities';
import { createStory, createChapter, createScene, updateScene } from '../stories';
import { generateId } from '$lib/utils';

let PROJECT_ID: string;
let tmpDir: string;

function insertTestProject() {
  const userId = generateId();
  PROJECT_ID = generateId();
  testDb.exec(
    `INSERT INTO users (id, email, username, password_hash, created_at) VALUES ('${userId}', '${userId}@test.com', 'user-${userId.slice(0, 8)}', 'hash', '2024-01-01')`
  );
  testDb.exec(
    `INSERT INTO projects (id, user_id, name, description, data_path, pinned, created_at, modified_at) VALUES ('${PROJECT_ID}', '${userId}', 'Test', null, '${tmpDir}', 0, '2024-01-01', '2024-01-01')`
  );
}

beforeEach(() => {
  migrate();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-backlinks-'));
  for (const dir of Object.values(ENTITY_DIRS)) {
    fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
  }
  fs.mkdirSync(path.join(tmpDir, 'notes', '_project'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'stories'), { recursive: true });
  insertTestProject();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('mentionsEntity', () => {
  it('matches the persisted mention link syntax', () => {
    expect(mentionsEntity('hi [@Holly](mention://character/abc-123) there', 'abc-123')).toBe(true);
  });

  it('does not match a different id or a plain name', () => {
    expect(mentionsEntity('[@Holly](mention://character/abc-123)', 'zzz')).toBe(false);
    expect(mentionsEntity('Holly walked in', 'abc-123')).toBe(false);
  });

  it('ignores non-string values', () => {
    expect(mentionsEntity(null, 'abc')).toBe(false);
    expect(mentionsEntity(42, 'abc')).toBe(false);
  });
});

describe('getBacklinks', () => {
  it('returns nothing when the entity is unreferenced', () => {
    const holly = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Holly' });
    expect(getBacklinks(PROJECT_ID, tmpDir, holly)).toEqual([]);
  });

  it('finds a mention in another entity body', () => {
    const holly = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Holly' });
    const keep = createEntity(PROJECT_ID, tmpDir, 'location', {
      name: 'Hollow Keep',
      body: `Ruled by [@Holly](mention://character/${holly.id}).`
    });

    const links = getBacklinks(PROJECT_ID, tmpDir, holly);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ kind: 'entity', id: keep.id, reason: 'mention' });
    expect(links[0].href).toContain('/locations/');
  });

  it('finds a mention in a custom field value', () => {
    const holly = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Holly' });
    const milo = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Milo' });
    updateEntity(PROJECT_ID, tmpDir, 'character', milo.id, {
      motivations: `Protect [@Holly](mention://character/${holly.id})`
    });

    const links = getBacklinks(PROJECT_ID, tmpDir, holly);
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ id: milo.id, reason: 'field' });
  });

  it('never reports the entity as referencing itself', () => {
    const holly = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Holly' });
    updateEntity(PROJECT_ID, tmpDir, 'character', holly.id, {
      body: `See [@Holly](mention://character/${holly.id})`
    });
    expect(getBacklinks(PROJECT_ID, tmpDir, holly)).toEqual([]);
  });

  it('finds scenes by participant, narrator, place, and body mention', () => {
    const holly = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Holly' });
    const story = createStory(tmpDir, 'A Story');
    const chapter = createChapter(tmpDir, story.id, 'One');

    const asParticipant = createScene(tmpDir, story.id, chapter.id, 'Participant');
    updateScene(tmpDir, story.id, chapter.id, asParticipant.id, { participants: [holly.id] });

    const asNarrator = createScene(tmpDir, story.id, chapter.id, 'Narrator');
    updateScene(tmpDir, story.id, chapter.id, asNarrator.id, { narrator: 'Holly' });

    const asPlace = createScene(tmpDir, story.id, chapter.id, 'Place');
    updateScene(tmpDir, story.id, chapter.id, asPlace.id, { place: 'Holly' });

    const asMention = createScene(tmpDir, story.id, chapter.id, 'Mention');
    updateScene(tmpDir, story.id, chapter.id, asMention.id, {
      body: `[@Holly](mention://character/${holly.id}) enters.`
    });

    createScene(tmpDir, story.id, chapter.id, 'Unrelated');

    const links = getBacklinks(PROJECT_ID, tmpDir, holly);
    const byName = Object.fromEntries(links.map((l) => [l.name, l.reason]));

    expect(links).toHaveLength(4);
    expect(byName).toEqual({
      Participant: 'participant',
      Narrator: 'narrator',
      Place: 'place',
      Mention: 'mention'
    });
    expect(links[0].context).toBe('A Story › One');
    expect(links[0].href).toContain('?scene=');
  });

  it('matches a participant stored as a name rather than an id', () => {
    const holly = createEntity(PROJECT_ID, tmpDir, 'character', { name: 'Holly' });
    const story = createStory(tmpDir, 'A Story');
    const chapter = createChapter(tmpDir, story.id, 'One');
    const scene = createScene(tmpDir, story.id, chapter.id, 'Legacy');
    updateScene(tmpDir, story.id, chapter.id, scene.id, { participants: ['Holly'] });

    expect(getBacklinks(PROJECT_ID, tmpDir, holly)).toHaveLength(1);
  });
});
