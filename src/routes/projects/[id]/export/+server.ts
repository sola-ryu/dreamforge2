import { redirect } from '@sveltejs/kit';
import archiver from 'archiver';
import { getProjectAccess } from '$lib/server/members';

export async function GET({ params, locals }) {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project } = access;

  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks: Buffer[] = [];

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  return new Promise((resolve) => {
    archive.on('end', () => {
      const zipBuffer = Buffer.concat(chunks);
      resolve(
        new Response(zipBuffer, {
          headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip"`
          }
        })
      );
    });

    archive.directory(project.dataPath, false);
    archive.finalize();
  });
}
