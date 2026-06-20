import { fail, redirect } from '@sveltejs/kit';
import {
  getCustomFieldDefs,
  addCustomFieldDef,
  deleteCustomFieldDef
} from '$lib/server/customFields';
import { routeToEntityType, entityTypeToRoute } from '$lib/utils/entityTypes';
import {
  getProjectAccess,
  listMembers,
  addMember,
  removeMember,
  updateMemberRole,
  getUserByEmailOrUsername
} from '$lib/server/members';
import type { EntityType } from '$lib/types';

export const load = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const access = getProjectAccess(params.id, locals.user.id);
  if (!access) throw redirect(302, '/projects');

  const { project, role } = access;

  const customFields = getCustomFieldDefs(params.id);
  const members = role === 'owner' ? listMembers(params.id) : [];

  return {
    project: { ...project, pinned: Boolean(project.pinned) },
    customFields,
    members,
    role
  };
};

export const actions = {
  addField: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role !== 'owner') return fail(403, { error: 'Only the project owner can manage fields' });

    const form = await request.formData();
    const entityType = form.get('entityType') as string;
    const key = form.get('key') as string;
    const label = form.get('label') as string;
    const fieldType = form.get('fieldType') as string;
    const refEntityType = (form.get('refEntityType') as string) || undefined;
    const placeholder = (form.get('placeholder') as string) || undefined;
    const required = form.get('required') === 'true';

    if (!entityType || !key || !label || !fieldType) {
      return fail(400, { error: 'entityType, key, label, and fieldType are required' });
    }

    const resolvedType = routeToEntityType(entityType);
    if (!resolvedType) {
      return fail(400, { error: 'Invalid entity type' });
    }

    const validFieldTypes = [
      'text',
      'textarea',
      'number',
      'tags',
      'markdown',
      'entityRef',
      'boolean',
      'date'
    ];
    if (!validFieldTypes.includes(fieldType)) {
      return fail(400, { error: 'Invalid field type' });
    }

    addCustomFieldDef(params.id, resolvedType, {
      key,
      label,
      fieldType: fieldType as any,
      refEntityType: refEntityType ? routeToEntityType(refEntityType) || null : null,
      placeholder,
      required
    });

    return { success: true };
  },

  deleteField: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role !== 'owner') return fail(403, { error: 'Only the project owner can manage fields' });

    const form = await request.formData();
    const fieldId = form.get('fieldId') as string;

    if (!fieldId) return fail(400, { error: 'Field ID required' });

    deleteCustomFieldDef(params.id, fieldId);

    return { success: true };
  },

  addMember: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role !== 'owner') return fail(403, { error: 'Only the project owner can manage members' });

    const form = await request.formData();
    const query = form.get('query') as string;
    const role = form.get('role') as string;

    if (!query) return fail(400, { error: 'Email or username is required' });
    if (!['editor', 'commenter'].includes(role)) return fail(400, { error: 'Invalid role' });

    const user = getUserByEmailOrUsername(query);
    if (!user) return fail(404, { error: 'User not found' });
    if (user.id === locals.user.id) return fail(400, { error: 'Cannot add yourself as a member' });

    addMember(params.id, user.id, role as 'editor' | 'commenter');

    return { success: true };
  },

  removeMember: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role !== 'owner') return fail(403, { error: 'Only the project owner can manage members' });

    const form = await request.formData();
    const userId = form.get('userId') as string;
    if (!userId) return fail(400, { error: 'User ID required' });

    removeMember(params.id, userId);

    return { success: true };
  },

  updateMemberRole: async ({ params, locals, request }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const access = getProjectAccess(params.id, locals.user.id);
    if (!access) return fail(404, { error: 'Project not found' });
    if (access.role !== 'owner') return fail(403, { error: 'Only the project owner can manage members' });

    const form = await request.formData();
    const userId = form.get('userId') as string;
    const role = form.get('role') as string;

    if (!userId) return fail(400, { error: 'User ID required' });
    if (!['editor', 'commenter'].includes(role)) return fail(400, { error: 'Invalid role' });

    updateMemberRole(params.id, userId, role as 'editor' | 'commenter');

    return { success: true };
  }
};
