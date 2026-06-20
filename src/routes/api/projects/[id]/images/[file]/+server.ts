import fs from 'node:fs';
import path from 'node:path';
import { getProjectAccess } from '$lib/server/members';

export async function GET({ params, locals }) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) return new Response('Not found', { status: 404 });
  const { project } = access;

  const filePath = path.join(project.dataPath, 'images', params.file);
  if (!fs.existsSync(filePath)) return new Response('Not found', { status: 404 });

  const ext = path.extname(filePath).toLowerCase();
  const mime: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };

  const content = fs.readFileSync(filePath);
  return new Response(content, {
    headers: { 'content-type': mime[ext] || 'application/octet-stream' }
  });
}
