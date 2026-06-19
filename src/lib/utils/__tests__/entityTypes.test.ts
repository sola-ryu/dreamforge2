import { describe, it, expect } from 'vitest';
import { routeToEntityType, entityTypeToRoute, isValidEntityRoute } from '../entityTypes';

describe('routeToEntityType', () => {
  it('maps routes to entity types', () => {
    expect(routeToEntityType('characters')).toBe('character');
    expect(routeToEntityType('organizations')).toBe('organization');
    expect(routeToEntityType('locations')).toBe('location');
    expect(routeToEntityType('cultures')).toBe('culture');
    expect(routeToEntityType('species')).toBe('species');
    expect(routeToEntityType('items')).toBe('item');
    expect(routeToEntityType('notes')).toBe('note');
  });

  it('returns null for unknown routes', () => {
    expect(routeToEntityType('stories')).toBeNull();
    expect(routeToEntityType('relations')).toBeNull();
    expect(routeToEntityType('')).toBeNull();
    expect(routeToEntityType('foo')).toBeNull();
  });

  it('is case-sensitive', () => {
    expect(routeToEntityType('Characters')).toBeNull();
    expect(routeToEntityType('CHARACTERS')).toBeNull();
  });
});

describe('entityTypeToRoute', () => {
  it('maps entity types to routes', () => {
    expect(entityTypeToRoute('character')).toBe('characters');
    expect(entityTypeToRoute('organization')).toBe('organizations');
    expect(entityTypeToRoute('location')).toBe('locations');
    expect(entityTypeToRoute('culture')).toBe('cultures');
    expect(entityTypeToRoute('species')).toBe('species');
    expect(entityTypeToRoute('item')).toBe('items');
    expect(entityTypeToRoute('note')).toBe('notes');
  });
});

describe('isValidEntityRoute', () => {
  it('returns true for valid entity routes', () => {
    expect(isValidEntityRoute('characters')).toBe(true);
    expect(isValidEntityRoute('items')).toBe(true);
  });

  it('returns false for non-entity routes', () => {
    expect(isValidEntityRoute('stories')).toBe(false);
    expect(isValidEntityRoute('')).toBe(false);
  });
});
