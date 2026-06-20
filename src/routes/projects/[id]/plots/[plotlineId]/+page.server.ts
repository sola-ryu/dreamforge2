import { fail, redirect } from '@sveltejs/kit';
import { getPlotline, updatePlotline, reorderBeats } from '$lib/server/plots';
import { listChapters, listScenes } from '$lib/server/stories';
import { getProjectAccess } from '$lib/server/members';

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

  const plotline = getPlotline(project.dataPath, params.plotlineId);
  if (!plotline) throw redirect(302, `/projects/${params.id}/plots`);

  const chapters = listChapters(project.dataPath, plotline.storyId);
  const chaptersWithScenes = chapters.map((ch) => ({
    ...ch,
    scenes: listScenes(project.dataPath, plotline.storyId, ch.id)
  }));

  return { plotline, chapters: chaptersWithScenes, projectName: project.name, role };
};

export const actions = {
  update: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const title = form.get('title') as string;
    if (title) {
      updatePlotline(project.dataPath, params.plotlineId, { title });
    }
    return { success: true };
  },

  linkScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const beatTitle = form.get('beatTitle') as string;
    const sceneId = (form.get('sceneId') as string) || null;

    const plotline = getPlotline(project.dataPath, params.plotlineId);
    if (!plotline) return fail(404, { error: 'Plotline not found' });

    const beats = plotline.beats.map((b) => (b.title === beatTitle ? { ...b, sceneId } : b));

    updatePlotline(project.dataPath, params.plotlineId, { beats });
    return { success: true };
  },

  reorderBeats: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const beatTitles = JSON.parse(form.get('beatTitles') as string) as string[];
    reorderBeats(project.dataPath, params.plotlineId, beatTitles);
    return { success: true };
  }
};
