import path from 'node:path';
import { env } from '$env/dynamic/private';

export function getDataDir(): string {
  const configured = env.DATA_DIR || process.env.DATA_DIR;
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), 'data', 'projects');
}
