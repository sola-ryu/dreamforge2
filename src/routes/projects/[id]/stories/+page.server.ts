import { fail, redirect } from '@sveltejs/kit';
import { listStories, createStory, createChapter, createScene, deleteStory } from '$lib/server/stories';
import { getProjectAccess } from '$lib/server/members';

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

  const stories = listStories(project.dataPath);

  return { stories, projectName: project.name, role };
};

export const actions = {
  create: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const title = form.get('title') as string;
    if (!title) return fail(400, { error: 'Title is required' });

    const description = form.get('description') as string;
    const story = createStory(project.dataPath, title, description);
    const chapter = createChapter(project.dataPath, story.id, 'Chapter 1');
    const scene = createScene(project.dataPath, story.id, chapter.id);

    return { success: true, storyId: story.id, chapterId: chapter.id, sceneId: scene.id };
  },

  delete: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const storyId = form.get('storyId') as string;
    deleteStory(project.dataPath, storyId);

    return { success: true };
  }
};
