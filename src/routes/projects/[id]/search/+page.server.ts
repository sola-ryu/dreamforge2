import { redirect } from '@sveltejs/kit';
import { searchEntities } from '$lib/server/entities';
import { getProjectAccess } from '$lib/server/members';

export const load = async ({ params, locals, url }) => {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

  const query = url.searchParams.get('q') || '';
  const results = query ? searchEntities(params.id, query) : [];

  return { query, results, projectName: project.name, role };
};
