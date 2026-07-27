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
import { updateProject, deleteProject } from '../projects';
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

function insertProject(name = 'Test Project') {
  userId = insertUser();
  projectId = generateId();
  testDb.exec(
    `INSERT INTO projects (id, user_id, name, description, data_path, pinned, created_at, modified_at) VALUES ('${projectId}', '${userId}', '${name}', null, '${tmpDir}', 0, '2024-01-01', '2024-01-01')`
  );
}

function insertComment(targetId: string) {
  const id = generateId();
  testDb.exec(
    `INSERT INTO comments (id, project_id, target_type, target_id, user_id, body, created_at, resolved) VALUES ('${id}', '${projectId}', 'entity', '${targetId}', '${userId}', 'Hi', '2024-01-01', 0)`
  );
}

function insertBookmark(entityId: string) {
  const id = generateId();
  testDb.exec(
    `INSERT INTO bookmarks (id, user_id, project_id, entity_id, created_at) VALUES ('${id}', '${userId}', '${projectId}', '${entityId}', '2024-01-01')`
  );
}

function insertMember() {
  const otherUserId = insertUser();
  const id = generateId();
  testDb.exec(
    `INSERT INTO project_members (id, project_id, user_id, role, created_at) VALUES ('${id}', '${projectId}', '${otherUserId}', 'editor', '2024-01-01')`
  );
}

function countRows(sql: string): number {
  return (testDb.prepare(sql).get() as { c: number }).c;
}

beforeAll(() => {
  migrate();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-projects-'));
  fs.mkdirSync(path.join(tmpDir, 'characters'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, 'project.json'),
    JSON.stringify({ id: 'x', name: 'Test Project', description: null, createdAt: '2024-01-01' })
  );
  insertProject();
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('updateProject', () => {
  it('updates the name and description in the DB', () => {
    updateProject(projectId, tmpDir, { name: 'Renamed', description: 'New desc' });

    const row = testDb
      .prepare('SELECT name, description FROM projects WHERE id = ?')
      .get(projectId) as {
      name: string;
      description: string | null;
    };
    expect(row.name).toBe('Renamed');
    expect(row.description).toBe('New desc');
  });

  it('updates project.json on disk', () => {
    updateProject(projectId, tmpDir, { name: 'Renamed', description: 'New desc' });

    const json = JSON.parse(fs.readFileSync(path.join(tmpDir, 'project.json'), 'utf-8'));
    expect(json.name).toBe('Renamed');
    expect(json.description).toBe('New desc');
  });

  it('does not throw if project.json is missing', () => {
    fs.rmSync(path.join(tmpDir, 'project.json'));
    expect(() =>
      updateProject(projectId, tmpDir, { name: 'Renamed', description: null })
    ).not.toThrow();

    const row = testDb.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as {
      name: string;
    };
    expect(row.name).toBe('Renamed');
  });
});

describe('deleteProject', () => {
  it('removes the project row and its data directory', () => {
    deleteProject(projectId, tmpDir);

    expect(countRows(`SELECT COUNT(*) c FROM projects WHERE id = '${projectId}'`)).toBe(0);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  it('cascades to comments, bookmarks, members, and entities', () => {
    const entity = createEntity(projectId, tmpDir, 'character', { name: 'Alice' });
    syncEntityToDb(projectId, 'character', entity.id, entity.frontmatter);
    insertComment(entity.id);
    insertBookmark(entity.id);
    insertMember();

    expect(countRows(`SELECT COUNT(*) c FROM entities WHERE project_id = '${projectId}'`)).toBe(1);
    expect(countRows(`SELECT COUNT(*) c FROM comments WHERE project_id = '${projectId}'`)).toBe(1);
    expect(countRows(`SELECT COUNT(*) c FROM bookmarks WHERE project_id = '${projectId}'`)).toBe(1);
    expect(
      countRows(`SELECT COUNT(*) c FROM project_members WHERE project_id = '${projectId}'`)
    ).toBe(1);

    deleteProject(projectId, tmpDir);

    expect(countRows(`SELECT COUNT(*) c FROM entities WHERE project_id = '${projectId}'`)).toBe(0);
    expect(countRows(`SELECT COUNT(*) c FROM comments WHERE project_id = '${projectId}'`)).toBe(0);
    expect(countRows(`SELECT COUNT(*) c FROM bookmarks WHERE project_id = '${projectId}'`)).toBe(0);
    expect(
      countRows(`SELECT COUNT(*) c FROM project_members WHERE project_id = '${projectId}'`)
    ).toBe(0);
  });

  it('does not throw if the data directory is already gone', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(() => deleteProject(projectId, tmpDir)).not.toThrow();
    expect(countRows(`SELECT COUNT(*) c FROM projects WHERE id = '${projectId}'`)).toBe(0);
  });
});
