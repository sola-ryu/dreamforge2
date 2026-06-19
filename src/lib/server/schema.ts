import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at').notNull()
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  dataPath: text('data_path').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  modifiedAt: text('modified_at').notNull()
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  name: text('name').notNull(),
  color: text('color')
});

export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  type: text('type').notNull(),
  name: text('name').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  status: text('status').notNull().default('draft'),
  imagePath: text('image_path'),
  createdAt: text('created_at').notNull(),
  modifiedAt: text('modified_at').notNull()
});

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  modifiedAt: text('modified_at').notNull()
});

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.id),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  modifiedAt: text('modified_at').notNull()
});

export const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(),
  chapterId: text('chapter_id')
    .notNull()
    .references(() => chapters.id),
  title: text('title'),
  narrator: text('narrator'),
  time: text('time'),
  place: text('place'),
  participants: text('participants', { mode: 'json' }).$type<string[]>().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  modifiedAt: text('modified_at').notNull()
});

export const relations = sqliteTable('relations', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  sourceId: text('source_id').notNull(),
  targetId: text('target_id').notNull(),
  relationType: text('relation_type').notNull(),
  label: text('label')
});

export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  entityId: text('entity_id').notNull(),
  createdAt: text('created_at').notNull()
});

export const trashItems = sqliteTable('trash_items', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  entityId: text('entity_id').notNull(),
  entityType: text('entity_type').notNull(),
  originalPath: text('original_path').notNull(),
  deletedAt: text('deleted_at').notNull(),
  expiresAt: text('expires_at').notNull()
});

export const customFieldDefs = sqliteTable('custom_field_defs', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  entityType: text('entity_type').notNull(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  fieldType: text('field_type').notNull(),
  refEntityType: text('ref_entity_type'),
  placeholder: text('placeholder'),
  required: integer('required', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0)
});
