import fs from 'node:fs';
import path from 'node:path';
import { generateId } from '$lib/utils';
import { getTemplateBeats } from './plotTemplates';

export interface PlotBeat {
  title: string;
  sceneId: string | null;
  sortOrder: number;
}

export interface Plotline {
  id: string;
  projectId: string;
  storyId: string;
  title: string;
  template: string | null;
  beats: PlotBeat[];
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

function getPlotlinesDir(projectPath: string): string {
  return path.join(projectPath, 'plotlines');
}

function getPlotlinePath(projectPath: string, plotlineId: string): string {
  return path.join(getPlotlinesDir(projectPath), `${plotlineId}.json`);
}

export function listPlotlines(projectPath: string): Plotline[] {
  const dir = getPlotlinesDir(projectPath);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const data = fs.readFileSync(path.join(dir, f), 'utf-8');
        return JSON.parse(data) as Plotline;
      } catch {
        return null;
      }
    })
    .filter((p): p is Plotline => p !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPlotline(projectPath: string, plotlineId: string): Plotline | null {
  const filePath = getPlotlinePath(projectPath, plotlineId);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as Plotline;
  } catch {
    return null;
  }
}

export function createPlotline(
  projectPath: string,
  data: { title: string; storyId: string; template?: string | null }
): Plotline {
  const id = generateId();
  const now = new Date().toISOString();
  const existing = listPlotlines(projectPath);
  const maxOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), -1);

  const templateBeats = getTemplateBeats(data.template || null);
  const beats: PlotBeat[] = templateBeats
    ? templateBeats.map((title, i) => ({ title, sceneId: null, sortOrder: i }))
    : [];

  const plotline: Plotline = {
    id,
    projectId: path.basename(projectPath),
    storyId: data.storyId,
    title: data.title,
    template: data.template || null,
    beats,
    sortOrder: maxOrder + 1,
    createdAt: now,
    modifiedAt: now
  };

  const dir = getPlotlinesDir(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getPlotlinePath(projectPath, id), JSON.stringify(plotline, null, 2));

  return plotline;
}

export function updatePlotline(
  projectPath: string,
  plotlineId: string,
  data: Partial<Plotline>
): Plotline | null {
  const plotline = getPlotline(projectPath, plotlineId);
  if (!plotline) return null;

  const updated: Plotline = {
    ...plotline,
    ...data,
    modifiedAt: new Date().toISOString()
  };

  fs.writeFileSync(getPlotlinePath(projectPath, plotlineId), JSON.stringify(updated, null, 2));
  return updated;
}

export function deletePlotline(projectPath: string, plotlineId: string): boolean {
  const filePath = getPlotlinePath(projectPath, plotlineId);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function reorderBeats(
  projectPath: string,
  plotlineId: string,
  beatIds: string[]
): Plotline | null {
  const plotline = getPlotline(projectPath, plotlineId);
  if (!plotline) return null;

  const beatMap = new Map(plotline.beats.map((b) => [b.title, b]));
  const reordered: PlotBeat[] = beatIds
    .map((title, i) => {
      const beat = beatMap.get(title);
      return beat ? { ...beat, sortOrder: i } : null;
    })
    .filter((b): b is PlotBeat => b !== null);

  return updatePlotline(projectPath, plotlineId, { beats: reordered });
}
