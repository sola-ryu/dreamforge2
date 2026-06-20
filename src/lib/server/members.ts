import db from './db';
import { projects, projectMembers, users } from './schema';
import { eq, and, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateId } from '$lib/utils';

const drizzleDb = drizzle(db);

export type ProjectRole = 'owner' | 'editor' | 'commenter';

export interface ProjectAccess {
  project: typeof projects.$inferSelect;
  role: ProjectRole;
}

export function getProjectAccess(projectId: string, userId: string): ProjectAccess | null {
  const project = drizzleDb
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) return null;

  if (project.userId === userId) {
    return { project, role: 'owner' };
  }

  const membership = drizzleDb
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get();

  if (!membership) return null;

  return { project, role: membership.role as ProjectRole };
}

export interface ProjectMember {
  id: string;
  userId: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

export function listMembers(projectId: string): ProjectMember[] {
  const rows = drizzleDb
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      email: users.email,
      username: users.username,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId))
    .all();

  return rows;
}

export function addMember(projectId: string, userId: string, role: 'editor' | 'commenter'): void {
  const existing = drizzleDb
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .get();

  if (existing) {
    drizzleDb
      .update(projectMembers)
      .set({ role })
      .where(eq(projectMembers.id, existing.id))
      .run();
  } else {
    drizzleDb
      .insert(projectMembers)
      .values({
        id: generateId(),
        projectId,
        userId,
        role,
        createdAt: new Date().toISOString()
      })
      .run();
  }
}

export function removeMember(projectId: string, userId: string): boolean {
  const result = drizzleDb
    .delete(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .run();
  return result.changes > 0;
}

export function updateMemberRole(
  projectId: string,
  userId: string,
  role: 'editor' | 'commenter'
): boolean {
  const result = drizzleDb
    .update(projectMembers)
    .set({ role })
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .run();
  return result.changes > 0;
}

export function getUserByEmailOrUsername(
  query: string
): { id: string; email: string; username: string } | null {
  return drizzleDb
    .select({ id: users.id, email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, query), eq(users.username, query)))
    .get() ?? null;
}

export function getMemberProjects(
  userId: string
): (typeof projects.$inferSelect)[] {
  const rows = drizzleDb
    .select({ project: projects })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(eq(projectMembers.userId, userId))
    .all();

  return rows.map((r) => r.project);
}
