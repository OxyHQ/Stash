import { describe, expect, test } from 'bun:test';
import {
  columnWidthRange,
  contentHeight,
  gridColumns,
  ICON_CELL,
  itemAt,
  itemFrame,
  itemsBetween,
  itemsGeometry,
  itemsTouching,
  layoutWidthThresholds,
  listColumns,
} from '@/lib/items-layout';

describe('the list', () => {
  const list = itemsGeometry('list', 'files', 1000);

  test('stacks compact rows on a desktop, touch-sized ones on a phone', () => {
    expect(itemFrame(list, 3)).toEqual({ x: 0, y: 84, width: 1000, height: 28 });
    expect(itemFrame(itemsGeometry('list', 'files', 390), 3).height).toBe(44);
    // A desktop window is driven by a pointer however narrow it is.
    expect(itemFrame(itemsGeometry('list', 'files', 390, true), 3).height).toBe(28);
    expect(contentHeight(list, 27)).toBe(27 * 28);
  });

  test('finds the row under a press anywhere across it, and none below the last', () => {
    expect(itemAt(list, 27, { x: 5, y: 85 })).toBe(3);
    expect(itemAt(list, 27, { x: 990, y: 85 })).toBe(3);
    expect(itemAt(list, 27, { x: 500, y: 27 * 28 + 2 })).toBeNull();
  });
});

describe('the icon grid', () => {
  const width = 1042;
  const grid = itemsGeometry('icons', 'files', width);

  test('spreads its columns across the width, as Finder does', () => {
    expect(grid.columns).toBe(gridColumns(width, 'files'));
    const last = itemFrame(grid, grid.columns - 1);
    expect(grid.pitchX).toBeGreaterThanOrEqual(ICON_CELL.width);
    expect(last.x + last.width).toBeLessThanOrEqual(width - 12);
    expect(width - 12 - (last.x + last.width)).toBeLessThan(grid.columns);
  });

  test('takes a press on an icon or its name, and the cell around them as the background', () => {
    const frame = itemFrame(grid, grid.columns + 2);
    const centre = frame.x + frame.width / 2;
    expect(itemAt(grid, 100, { x: centre, y: frame.y + 40 })).toBe(grid.columns + 2);
    expect(itemAt(grid, 100, { x: centre, y: frame.y + 90 })).toBe(grid.columns + 2);
    // The cell's corner, beside the icon, is the background (a rubber band starts there).
    expect(itemAt(grid, 100, { x: frame.x + 2, y: frame.y + 20 })).toBeNull();
    // Past the last item there is nothing.
    expect(itemAt(grid, grid.columns + 1, { x: centre, y: frame.y + 40 })).toBeNull();
  });

  test('a rubber band touches the icons and names it crosses, in order', () => {
    const second = itemFrame(grid, 1);
    const band = { x: second.x + second.width / 2, y: 30, width: 2 * grid.pitchX, height: 140 };
    expect(itemsTouching(grid, 100, band)).toEqual([
      1,
      2,
      3,
      grid.columns + 1,
      grid.columns + 2,
      grid.columns + 3,
    ]);
  });
});

describe('a folder of thousands', () => {
  test('draws only the rows near what can be seen', () => {
    const list = itemsGeometry('list', 'files', 1000);
    const range = itemsBetween(list, 10_000, 28_000 - 600, 28_000 + 1_200);
    expect(range).toEqual({ start: 978, end: 1043 });
    expect(range.end - range.start).toBeLessThan(100);
  });

  test('draws whole rows of a grid', () => {
    const grid = itemsGeometry('icons', 'files', 1042);
    const range = itemsBetween(grid, 10_000, 0, 600);
    expect(range.start).toBe(0);
    expect(range.end % grid.columns).toBe(0);
    expect(range.end).toBe(Math.ceil((600 - 12) / ICON_CELL.height) * grid.columns);
  });
});

describe('what the view redraws for as the window resizes', () => {
  test("a grid's columns change only at its thresholds", () => {
    for (const layout of ['files', 'photos'] as const) {
      const thresholds = layoutWidthThresholds('icons', layout, true);
      for (let width = 200; width < 2000; width += 1) {
        const crossed = thresholds.includes(width);
        expect(gridColumns(width, layout) !== gridColumns(width - 1, layout)).toBe(crossed);
      }
    }
  });

  test("the list's columns change only at its thresholds, its rows' height too off a desktop", () => {
    const desktop = layoutWidthThresholds('list', 'files', true);
    const phone = layoutWidthThresholds('list', 'files', false);
    for (let width = 200; width < 1200; width += 1) {
      const columnsChange =
        JSON.stringify(listColumns(width)) !== JSON.stringify(listColumns(width - 1));
      expect(columnsChange).toBe(desktop.includes(width));
      const rows = (at: number) => itemsGeometry('list', 'files', at, false).pitchY;
      expect(columnsChange || rows(width) !== rows(width - 1)).toBe(phone.includes(width));
    }
  });

  test('the widths a grid keeps its columns at', () => {
    const { least, most } = columnWidthRange(gridColumns(1042, 'files'), 'files');
    expect(gridColumns(least, 'files')).toBe(gridColumns(1042, 'files'));
    expect(gridColumns(most - 1, 'files')).toBe(gridColumns(1042, 'files'));
    expect(gridColumns(most, 'files')).toBe(gridColumns(1042, 'files') + 1);
  });
});
