import { describe, expect, test } from 'bun:test';
import {
  NAME_ORDER,
  type SortColumn,
  type SortDirection,
  sortBy,
  sortItems,
  visibleItems,
} from '@/lib/sorting';
import { local } from './fixtures';

describe('sorting', () => {
  const items = [
    local('b.txt', { size: 10, modifiedAt: 3 }),
    local('Pictures', { isFolder: true, size: null, modifiedAt: 1 }),
    local('a.png', { size: 300, modifiedAt: 2 }),
    local('c.txt', { size: 10, modifiedAt: 3 }),
  ];
  const names = (column: SortColumn, direction: SortDirection) =>
    sortItems(items, { column, direction }).map((item) => item.name);

  test('orders by each column, ties by name', () => {
    expect(names('name', 'ascending')).toEqual(['a.png', 'b.txt', 'c.txt', 'Pictures']);
    expect(names('name', 'descending')).toEqual(['Pictures', 'c.txt', 'b.txt', 'a.png']);
    expect(names('date', 'descending')).toEqual(['c.txt', 'b.txt', 'a.png', 'Pictures']);
    expect(names('size', 'ascending')).toEqual(['Pictures', 'b.txt', 'c.txt', 'a.png']);
    expect(names('kind', 'ascending')).toEqual(['Pictures', 'a.png', 'b.txt', 'c.txt']);
  });

  test('puts folders before even an empty file by size', () => {
    const withEmpty = [local('a.txt', { size: 0 }), local('Zed', { isFolder: true, size: null })];
    expect(
      sortItems(withEmpty, { column: 'size', direction: 'ascending' }).map((item) => item.name),
    ).toEqual(['Zed', 'a.txt']);
  });

  test('never changes the items it was given', () => {
    sortItems(items, NAME_ORDER);
    expect(items[0]?.name).toBe('b.txt');
  });

  test('a header pressed again reverses; dates and sizes start newest and largest', () => {
    expect(sortBy(NAME_ORDER, 'name')).toEqual({ column: 'name', direction: 'descending' });
    expect(sortBy(NAME_ORDER, 'date')).toEqual({ column: 'date', direction: 'descending' });
    expect(sortBy({ column: 'size', direction: 'descending' }, 'kind')).toEqual({
      column: 'kind',
      direction: 'ascending',
    });
  });
});

describe('what is shown', () => {
  const items = [local('.bashrc'), local('Año nuevo.txt'), local('notes.md')];

  test('hidden items only when asked for', () => {
    expect(visibleItems(items, '', false).map((item) => item.name)).toEqual([
      'Año nuevo.txt',
      'notes.md',
    ]);
    expect(visibleItems(items, '', true)).toHaveLength(3);
  });

  test('the search finds names case and accents aside, and blank finds everything', () => {
    expect(visibleItems(items, 'ANO', false).map((item) => item.name)).toEqual(['Año nuevo.txt']);
    expect(visibleItems(items, '  ', false)).toHaveLength(2);
    expect(visibleItems(items, 'bash', false)).toHaveLength(0);
  });
});
