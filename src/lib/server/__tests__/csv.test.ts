import { describe, it, expect } from 'vitest';
import { serializeCSV, parseCSV, parseCSVWithHeaders } from '../csv';

describe('serializeCSV', () => {
  it('serializes rows with headers', () => {
    const rows = [
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' }
    ];
    const result = serializeCSV(rows);
    expect(result).toBe('name,age\nAlice,30\nBob,25\n');
  });

  it('returns empty string for empty array', () => {
    expect(serializeCSV([])).toBe('');
  });

  it('escapes fields with commas', () => {
    const rows = [{ name: 'Smith, John', age: '40' }];
    const result = serializeCSV(rows);
    expect(result).toBe('name,age\n"Smith, John",40\n');
  });

  it('escapes fields with double quotes', () => {
    const rows = [{ note: 'He said "hello"' }];
    const result = serializeCSV(rows);
    expect(result).toBe('note\n"He said ""hello"""\n');
  });

  it('escapes fields with newlines', () => {
    const rows = [{ desc: 'line1\nline2' }];
    const result = serializeCSV(rows);
    expect(result).toBe('desc\n"line1\nline2"\n');
  });
});

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const result = parseCSV('a,b,c\n1,2,3\n4,5,6');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6']
    ]);
  });

  it('handles quoted fields', () => {
    const result = parseCSV('name,age\n"Smith, John",30');
    expect(result).toEqual([
      ['name', 'age'],
      ['Smith, John', '30']
    ]);
  });

  it('handles quoted fields with escaped quotes', () => {
    const result = parseCSV('note\n"He said ""hello"""');
    expect(result).toEqual([['note'], ['He said "hello"']]);
  });

  it('handles CRLF line endings', () => {
    const result = parseCSV('a,b\r\n1,2\r\n3,4');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4']
    ]);
  });

  it('handles trailing newline', () => {
    const result = parseCSV('a,b\n1,2\n');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2']
    ]);
  });

  it('handles single field per row', () => {
    const result = parseCSV('a\nb\nc');
    expect(result).toEqual([['a'], ['b'], ['c']]);
  });

  it('handles empty fields', () => {
    const result = parseCSV('a,,c\n1,,3');
    expect(result).toEqual([
      ['a', '', 'c'],
      ['1', '', '3']
    ]);
  });
});

describe('parseCSVWithHeaders', () => {
  it('parses CSV with headers into objects', () => {
    const result = parseCSVWithHeaders('name,age\nAlice,30\nBob,25');
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' }
    ]);
  });

  it('returns empty array for header-only CSV', () => {
    expect(parseCSVWithHeaders('name,age')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseCSVWithHeaders('')).toEqual([]);
  });

  it('skips blank rows', () => {
    const result = parseCSVWithHeaders('name,age\nAlice,30\n\nBob,25');
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' }
    ]);
  });

  it('handles missing fields as empty strings', () => {
    const result = parseCSVWithHeaders('name,age,extra\nAlice,30');
    expect(result).toEqual([{ name: 'Alice', age: '30', extra: '' }]);
  });

  it('trims header names', () => {
    const result = parseCSVWithHeaders(' name , age \nAlice,30');
    expect(result).toEqual([{ name: 'Alice', age: '30' }]);
  });
});
