import { redirect } from '@sveltejs/kit';
import { getProjectAccess } from '$lib/server/members';
import { getProjectStats } from '$lib/server/stats';
import { scanProject, watchProject } from '$lib/server/watcher';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) {
    throw redirect(302, '/projects');
  }

  const { project, role } = access;

  scanProject(params.id, project.dataPath);
  watchProject(params.id, project.dataPath);

  return {
    project: {
      ...project,
      pinned: Boolean(project.pinned)
    },
    stats: getProjectStats(params.id, project.dataPath),
    role
  };
};
