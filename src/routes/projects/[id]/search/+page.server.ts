import { redirect } from '@sveltejs/kit';
import { searchEntities } from '$lib/server/entities';
import { getProjectAccess } from '$lib/server/members';
import { scanProject, watchProject } from '$lib/server/watcher';

export const load = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

  scanProject(params.id, project.dataPath);
  watchProject(params.id, project.dataPath);

  const query = url.searchParams.get('q') || '';
  const results = query ? searchEntities(params.id, query) : [];

  return { query, results, projectName: project.name, role };
};
