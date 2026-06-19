import fs from 'node:fs';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { readMarkdownFile } from './markdown';
import { syncEntityToDb } from './entities';
import type { EntityType } from '$lib/types';

const watchers = new Map<string, FSWatcher>();

const ENTITY_PATTERNS: Record<string, EntityType> = {
  characters: 'character',
  organizations: 'organization',
  locations: 'location',
  cultures: 'culture',
  species: 'species',
  items: 'item'
};

export function watchProject(projectId: string, projectPath: string): void {
  if (watchers.has(projectId)) return;

  const watcher = chokidar.watch(projectPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false,
    depth: 4
  });

  watcher.on('add', (filePath) => {
    if (!filePath.endsWith('.md')) return;
    handleFileChange(projectId, projectPath, filePath);
  });

  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.md')) return;
    handleFileChange(projectId, projectPath, filePath);
  });

  watcher.on('unlink', (filePath) => {
    if (!filePath.endsWith('.md')) return;
    const relPath = path.relative(projectPath, filePath);
    const id = path.basename(filePath, '.md');
    const dir = path.dirname(relPath);
    const dirName = path.basename(dir);

    if (dirName === '_project' || dirName === '_story') {
      handleNoteFileChange(projectId, filePath);
    } else if (dirName === 'scenes') {
      handleSceneFileChange(projectId, filePath);
    } else if (dirName === 'chapters') {
      handleChapterFileChange(projectId, filePath);
    }
  });

  watchers.set(projectId, watcher);
}

export function unwatchProject(projectId: string): void {
  const watcher = watchers.get(projectId);
  if (watcher) {
    watcher.close();
    watchers.delete(projectId);
  }
}

function handleFileChange(projectId: string, projectPath: string, filePath: string): void {
  const relPath = path.relative(projectPath, filePath);
  const dir = path.dirname(relPath);
  const dirName = path.basename(dir);

  if (dirName === '_project' || dirName === '_story') {
    handleNoteFileChange(projectId, filePath);
    return;
  }

  if (dirName === 'scenes') {
    handleSceneFileChange(projectId, filePath);
    return;
  }

  if (dirName === 'chapters') {
    handleChapterFileChange(projectId, filePath);
    return;
  }

  const entityDir = path.basename(dir);
  const entityType = ENTITY_PATTERNS[entityDir];

  if (!entityType) return;

  const md = readMarkdownFile(filePath);
  if (!md) return;

  syncEntityToDb(projectId, entityType, md.frontmatter.id as string, md.frontmatter);
}

function handleNoteFileChange(projectId: string, filePath: string): void {
  const md = readMarkdownFile(filePath);
  if (!md) return;
  syncEntityToDb(projectId, 'note', md.frontmatter.id as string, md.frontmatter);
}

function handleSceneFileChange(_projectId: string, _filePath: string): void {
  // Will be implemented when scenes module is built
}

function handleChapterFileChange(_projectId: string, _filePath: string): void {
  // Will be implemented when chapters module is built
}

export function scanProject(projectId: string, projectPath: string): void {
  const entityDirs = ['characters', 'organizations', 'locations', 'cultures', 'species', 'items'];

  for (const dir of entityDirs) {
    const fullDir = path.join(projectPath, dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.md'));
    const entityType = ENTITY_PATTERNS[dir];
    if (!entityType) continue;

    for (const file of files) {
      const filePath = path.join(fullDir, file);
      const md = readMarkdownFile(filePath);
      if (!md) continue;
      syncEntityToDb(projectId, entityType, md.frontmatter.id as string, md.frontmatter);
    }
  }

  // Scan notes (project-wide and per-story)
  const notesProjectDir = path.join(projectPath, 'notes', '_project');
  if (fs.existsSync(notesProjectDir)) {
    const files = fs.readdirSync(notesProjectDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(notesProjectDir, file);
      const md = readMarkdownFile(filePath);
      if (!md) continue;
      syncEntityToDb(projectId, 'note', md.frontmatter.id as string, md.frontmatter);
    }
  }
}
