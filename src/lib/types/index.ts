export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  dataPath: string;
  pinned: boolean;
  createdAt: string;
  modifiedAt: string;
}

export type EntityType =
  | 'character'
  | 'organization'
  | 'location'
  | 'culture'
  | 'species'
  | 'item'
  | 'note';

export interface EntityIndex {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  tags: string[];
  status: 'draft' | 'wip' | 'complete';
  imagePath: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface Story {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

export interface Scene {
  id: string;
  chapterId: string;
  title: string | null;
  narrator: string | null;
  time: string | null;
  place: string | null;
  participants: string[];
  sortOrder: number;
  createdAt: string;
  modifiedAt: string;
}

export interface Relation {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  label: string | null;
}

export interface Bookmark {
  id: string;
  userId: string;
  projectId: string;
  entityId: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string | null;
}

export type Theme = 'light' | 'dark' | 'monochrome';
