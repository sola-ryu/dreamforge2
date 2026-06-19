import { describe, it, expect } from 'vitest';
import { cn, generateId, slugify, formatDate } from '../index';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    expect(cn('base', true && 'active')).toBe('base active');
  });

  it('handles undefined and null', () => {
    expect(cn('a', undefined, 'b', null)).toBe('a b');
  });

  it('merges tailwind classes (last wins)', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns a UUID format', () => {
    const uuid = generateId();
    expect(uuid).toMatch(/^[0-9a-f-]+$/);
  });
});

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world foo')).toBe('hello-world-foo');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('handles multiple hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('trims whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2026-06-19T12:00:00.000Z');
    expect(result).toContain('Jun');
    expect(result).toContain('19');
    expect(result).toContain('2026');
  });

  it('handles edge case dates', () => {
    const result = formatDate('2024-06-15T12:00:00.000Z');
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });
});
