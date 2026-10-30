import { describe, expect, test } from 'bun:test';
import {
  bandSelect,
  type Box,
  boxBetween,
  clickSelect,
  focusEnd,
  keepShown,
  moveFocus,
  NO_SELECTION,
  selectAll,
  TYPE_SELECT_PAUSE_MS,
  typedSoFar,
  typeSelect,
} from '@/lib/selection';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

describe('clicks', () => {
  test('select one, Shift extends from the anchor and ⌘ adds or removes one', () => {
    let selection = clickSelect(NO_SELECTION, ORDER, 'b');
    expect(selection).toEqual({ keys: ['b'], anchor: 'b', focus: 'b' });
    selection = clickSelect(selection, ORDER, 'd', { isExtending: true });
    expect(selection.keys).toEqual(['b', 'c', 'd']);
    expect(selection.anchor).toBe('b');
    selection = clickSelect(selection, ORDER, 'a', { isExtending: true });
    expect(selection.keys).toEqual(['a', 'b']);
    selection = clickSelect(selection, ORDER, 'e', { isToggling: true });
    expect(selection.keys).toEqual(['a', 'b', 'e']);
    selection = clickSelect(selection, ORDER, 'a', { isToggling: true });
    expect(selection.keys).toEqual(['b', 'e']);
  });

  test('on a selected item keep the others, so they can be dragged together', () => {
    const selection = { keys: ['b', 'e'], anchor: 'b', focus: 'b' };
    expect(clickSelect(selection, ORDER, 'e').keys).toEqual(['b', 'e']);
    expect(clickSelect(selection, ORDER, 'c').keys).toEqual(['c']);
  });

  test('Shift and ⌘ together add the range to what was selected', () => {
    const selection = { keys: ['a'], anchor: 'c', focus: 'c' };
    expect(
      clickSelect(selection, ORDER, 'e', { isExtending: true, isToggling: true }).keys,
    ).toEqual(['a', 'c', 'd', 'e']);
  });

  test('select all, and items no longer shown leave the selection', () => {
    expect(selectAll(ORDER).keys).toEqual(ORDER);
    expect(keepShown({ keys: ['b', 'x'], anchor: 'x', focus: 'x' }, ORDER)).toEqual({
      keys: ['b'],
      anchor: 'b',
      focus: 'b',
    });
    const unchanged = { keys: ['a'], anchor: 'a', focus: 'a' };
    expect(keepShown(unchanged, ORDER)).toBe(unchanged);
  });
});

describe('arrow keys', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  test('move through a list, Shift extending from the anchor', () => {
    let selection = moveFocus(NO_SELECTION, order, 1);
    expect(selection.keys).toEqual(['a']);
    selection = moveFocus(selection, order, 1);
    expect(selection.keys).toEqual(['b']);
    selection = moveFocus(moveFocus(selection, order, 1, true), order, 1, true);
    expect(selection.keys).toEqual(['b', 'c', 'd']);
    expect(selection.anchor).toBe('b');
    expect(moveFocus(NO_SELECTION, order, -1).keys).toEqual(['g']);
    expect(moveFocus(NO_SELECTION, [], 1)).toBe(NO_SELECTION);
  });

  test('go down a grid a row at a time, past the last row to the last item', () => {
    let selection = moveFocus(selectAll(['a']), order, 3);
    expect(selection.keys).toEqual(['d']);
    selection = moveFocus(selection, order, 3);
    expect(selection.keys).toEqual(['g']);
    expect(moveFocus(selection, order, 3).keys).toEqual(['g']);
    // From the row above the last, a full row down passes the end: the last item.
    expect(moveFocus({ keys: ['e'], anchor: 'e', focus: 'e' }, order, 3).keys).toEqual(['g']);
    expect(moveFocus({ keys: ['b'], anchor: 'b', focus: 'b' }, order, -3).keys).toEqual(['a']);
  });

  test('Home and End go to the ends, Shift extending', () => {
    expect(focusEnd(NO_SELECTION, order, 'first').keys).toEqual(['a']);
    expect(focusEnd(NO_SELECTION, order, 'last').keys).toEqual(['g']);
    expect(focusEnd({ keys: ['e'], anchor: 'e', focus: 'e' }, order, 'last', true).keys).toEqual([
      'e',
      'f',
      'g',
    ]);
  });
});

describe('the rubber band', () => {
  const frames = new Map<string, Box>([
    ['a', { x: 0, y: 0, width: 100, height: 100 }],
    ['b', { x: 100, y: 0, width: 100, height: 100 }],
    ['c', { x: 0, y: 100, width: 100, height: 100 }],
  ]);
  const order = ['a', 'b', 'c'];

  test('is the box between where it began and where it is', () => {
    expect(boxBetween({ x: 150, y: 50 }, { x: 50, y: 150 })).toEqual({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
  });

  test('selects what it touches, alone, or flipping the selection with a modifier', () => {
    const band = boxBetween({ x: 150, y: 50 }, { x: 50, y: 150 });
    expect(bandSelect(NO_SELECTION, order, frames, band, false).keys).toEqual(['a', 'b', 'c']);
    const thin = boxBetween({ x: 120, y: 10 }, { x: 180, y: 20 });
    const before = { keys: ['c'], anchor: 'c', focus: 'c' };
    expect(bandSelect(before, order, frames, thin, false).keys).toEqual(['b']);
    expect(bandSelect(before, order, frames, thin, true).keys).toEqual(['c', 'b']);
    expect(bandSelect({ keys: ['b'], anchor: 'b', focus: 'b' }, order, frames, thin, true)).toEqual(
      NO_SELECTION,
    );
  });

  test('that touches nothing selects nothing', () => {
    expect(
      bandSelect(NO_SELECTION, order, frames, { x: 300, y: 300, width: 5, height: 5 }, false),
    ).toEqual(NO_SELECTION);
  });
});

describe('type-select', () => {
  const shown = [
    { key: '1', name: 'Budget.xlsx' },
    { key: '2', name: 'notes.md' },
    { key: '3', name: 'Notas' },
    { key: '4', name: 'Zebra' },
  ];

  test('selects the first name that begins so, case and accents aside', () => {
    expect(typeSelect(shown, 'no')).toBe('2');
    expect(typeSelect(shown, 'NOTA')).toBe('3');
  });

  test('with none, selects the first name after what was typed', () => {
    expect(typeSelect(shown, 'c')).toBe('3');
    expect(typeSelect(shown, 'zz')).toBe('4');
    expect(typeSelect(shown, '')).toBeNull();
    expect(typeSelect([], 'a')).toBeNull();
  });

  test('keeps typing within the pause and starts again after it', () => {
    const first = typedSoFar({ text: '', at: 0 }, 'n', 10_000);
    expect(first.text).toBe('n');
    expect(typedSoFar(first, 'o', 10_000 + TYPE_SELECT_PAUSE_MS - 1).text).toBe('no');
    expect(typedSoFar(first, 'o', 10_000 + TYPE_SELECT_PAUSE_MS).text).toBe('o');
  });
});
