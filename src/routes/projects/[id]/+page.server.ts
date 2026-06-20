import { redirect } from '@sveltejs/kit';
import { getProjectAccess } from '$lib/server/members';

export const load = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) {
    throw redirect(302, '/projects');
  }

  const { project, role } = access;

  return {
    project: {
      ...project,
      pinned: Boolean(project.pinned)
    },
    role
  };
};
