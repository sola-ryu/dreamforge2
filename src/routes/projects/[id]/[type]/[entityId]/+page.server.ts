import { fail, redirect } from '@sveltejs/kit';
import { getEntity, updateEntity, searchEntities } from '$lib/server/entities';
import { routeToEntityType } from '$lib/utils/entityTypes';
import { addBookmark, removeBookmark, isBookmarked } from '$lib/server/bookmarks';
import { noteToScene } from '$lib/server/conversion';
import { listStories, listChapters } from '$lib/server/stories';
import { getCustomFieldDefs } from '$lib/server/customFields';
import { softDeleteEntity, restoreEntity } from '$lib/server/trash';
import {
  getImagesForEntity,
  listProjectImages,
  linkEntityToImage,
  unlinkEntityFromImage
} from '$lib/server/images';
import { mergeFields } from '$lib/entityFields';
import { ENTITY_FIELDS } from '$lib/entityFields';
import { getProjectAccess } from '$lib/server/members';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const entityType = routeToEntityType(params.type);
  if (!entityType) throw redirect(302, `/projects/${params.id}`);

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');
  const { project, role } = access;

  const entity = getEntity(params.id, project.dataPath, entityType, params.entityId);
  if (!entity) throw redirect(302, `/projects/${params.id}/${params.type}`);

  const bookmarked = isBookmarked(locals.user.id, params.id, params.entityId);

  const stories = entityType === 'note' ? listStories(project.dataPath) : [];
  const storiesWithChapters = stories.map((s) => ({
    ...s,
    chapters: listChapters(project.dataPath, s.id)
  }));

  const customFieldDefs = getCustomFieldDefs(params.id, entityType).map((f) => ({
    key: f.key,
    label: f.label,
    type: f.fieldType,
    entityType: f.refEntityType || undefined,
    placeholder: f.placeholder || undefined,
    required: f.required
  }));

  const mergedFields = mergeFields(ENTITY_FIELDS[entityType], customFieldDefs);
  const entityImages = getImagesForEntity(params.id, params.entityId);
  const projectImages = listProjectImages(params.id, project.dataPath);

  const allEntities = searchEntities(params.id, '').map((e) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    status: e.status
  }));

  return {
    entity,
    projectName: project.name,
    entityType,
    bookmarked,
    stories: storiesWithChapters,
    customFields: mergedFields,
    entityImages,
    projectImages,
    entities: allEntities,
    role,
    currentUserId: locals.user.id,
    projectOwnerId: project.userId
  };
};

export const actions = {
  update: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const customFieldDefs = getCustomFieldDefs(params.id, entityType);
    const tagFields = new Set<string>(['tags']);
    for (const f of ENTITY_FIELDS[entityType]) {
      if (f.type === 'tags') tagFields.add(f.key);
    }
    for (const f of customFieldDefs) {
      if (f.fieldType === 'tags') tagFields.add(f.key);
    }

    const boolFields = new Set<string>();
    for (const f of ENTITY_FIELDS[entityType]) {
      if (f.type === 'boolean') boolFields.add(f.key);
    }
    for (const f of customFieldDefs) {
      if (f.fieldType === 'boolean') boolFields.add(f.key);
    }

    const form = await request.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (tagFields.has(key)) {
        data[key] = (value as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        data[key] = value;
      }
    }
    for (const key of boolFields) {
      if (!(key in data)) data[key] = false;
    }
    updateEntity(params.id, project.dataPath, entityType, params.entityId, data);
    return { success: true };
  },

  delete: async ({ params, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const trashItem = softDeleteEntity(params.id, project.dataPath, entityType, params.entityId);
    if (!trashItem) return fail(500, { error: 'Failed to delete entity' });
    return { success: true, trashItem };
  },

  convertToScene: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (entityType !== 'note') return fail(400, { error: 'Only notes can be converted' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;

    const form = await request.formData();
    const storyId = form.get('storyId') as string;
    const chapterId = (form.get('chapterId') as string) || null;
    const newChapterTitle = form.get('newChapterTitle') as string;

    const scene = noteToScene(
      params.id,
      project.dataPath,
      params.entityId,
      storyId,
      chapterId,
      newChapterTitle
    );
    if (!scene) return fail(500, { error: 'Conversion failed' });
    return { success: true, sceneId: scene.id };
  },

  toggleBookmark: async ({ params, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    if (isBookmarked(locals.user.id, params.id, params.entityId)) {
      removeBookmark(locals.user.id, params.id, params.entityId);
    } else {
      addBookmark(locals.user.id, params.id, params.entityId);
    }
    return { success: true };
  },

  restore: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const { project } = access;
    const form = await request.formData();
    const trashId = form.get('trashId') as string;
    if (!trashId) return fail(400, { error: 'Trash ID required' });
    const ok = restoreEntity(params.id, project.dataPath, trashId);
    if (!ok) return fail(500, { error: 'Restore failed' });
    return { success: true };
  },

  linkImage: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const form = await request.formData();
    const imageId = form.get('imageId') as string;
    if (!imageId) return fail(400, { error: 'Image ID required' });
    linkEntityToImage(params.id, imageId, params.entityId);
    return { success: true };
  },

  unlinkImage: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });
    const entityType = routeToEntityType(params.type);
    if (!entityType) return fail(400, { error: 'Invalid entity type' });
    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role === 'commenter') return fail(403, { error: 'Insufficient permissions' });
    const form = await request.formData();
    const imageId = form.get('imageId') as string;
    if (!imageId) return fail(400, { error: 'Image ID required' });
    unlinkEntityFromImage(params.id, imageId, params.entityId);
    return { success: true };
  }
};
