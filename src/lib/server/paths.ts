import fs from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';

export function getDataDir(): string {
  const configured = env.DATA_DIR || process.env.DATA_DIR;
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), 'data', 'projects');
}

/**
 * Projects store an absolute `dataPath`, which does not survive moving the database
 * between environments (a project created at `/data/projects/x` inside Docker is
 * missing when the same DB is opened on the host). Prefer the stored path when it
 * still exists, otherwise fall back to the configured DATA_DIR.
 */
export function resolveProjectPath(projectId: string, storedPath: string): string {
  if (storedPath && fs.existsSync(storedPath)) return storedPath;

  const fallback = path.join(getDataDir(), projectId);
  if (fs.existsSync(fallback)) return fallback;

  return storedPath || fallback;
}
