/** How a location's items are ordered and found. */
import { type Item, itemDate, itemKind } from '@/lib/items';
import { KIND_ORDER } from '@/lib/kinds';
import { compareNames, fold } from '@/lib/names';

export type SortColumn = 'name' | 'date' | 'size' | 'kind';
export type SortDirection = 'ascending' | 'descending';
export interface SortOrder {
  column: SortColumn;
  direction: SortDirection;
}

export const NAME_ORDER: SortOrder = { column: 'name', direction: 'ascending' };

function compareBy(column: SortColumn, first: Item, second: Item): number {
  switch (column) {
    case 'date':
      return (itemDate(first) ?? 0) - (itemDate(second) ?? 0);
    case 'size':
      // Folders and albums have no size: they come first, as Finder keeps them.
      return (first.size ?? -1) - (second.size ?? -1);
    case 'kind':
      return KIND_ORDER.indexOf(itemKind(first)) - KIND_ORDER.indexOf(itemKind(second));
    default:
      return 0;
  }
}

/**
 * Items in the order chosen; ties by name, then by key, so the order never
 * depends on how the source listed them.
 */
export function sortItems<T extends Item>(items: readonly T[], order: SortOrder): T[] {
  const sign = order.direction === 'ascending' ? 1 : -1;
  return items.slice().sort((first, second) => {
    const byColumn = compareBy(order.column, first, second);
    if (byColumn !== 0) return sign * byColumn;
    const byName = compareNames(first.name, second.name);
    if (byName !== 0) return sign * byName;
    return first.key < second.key ? -1 : first.key > second.key ? 1 : 0;
  });
}

/**
 * Pressing a column's header: that column, names ascending and dates and
 * sizes newest and largest first, as Finder starts them; pressing the sorted
 * column again reverses it.
 */
export function sortBy(current: SortOrder, column: SortColumn): SortOrder {
  if (current.column === column) {
    return { column, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
  }
  const startsDescending = column === 'date' || column === 'size';
  return { column, direction: startsDescending ? 'descending' : 'ascending' };
}

/**
 * The items shown: hidden ones only when asked for, and only those whose name
 * has the search's text, case and accents aside.
 */
export function visibleItems<T extends Item>(
  items: readonly T[],
  search: string,
  isShowingHidden: boolean,
): T[] {
  const query = fold(search.trim());
  return items.filter(
    (item) => (isShowingHidden || !item.isHidden) && (!query || fold(item.name).includes(query)),
  );
}
