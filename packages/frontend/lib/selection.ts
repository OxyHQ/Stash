/**
 * Which items are selected, and how clicks, keys, a rubber band and typing a
 * name change that, as Finder does. Items are named by their keys, in the
 * order the view shows them.
 */
import { compareNames, fold } from '@/lib/names';

/** The selected keys, with the anchor a Shift-click extends from and the one the keyboard is at. */
export interface Selection {
  readonly keys: readonly string[];
  readonly anchor: string | null;
  readonly focus: string | null;
}

export const NO_SELECTION: Selection = { keys: [], anchor: null, focus: null };

export function isSelected(selection: Selection, key: string): boolean {
  return selection.keys.includes(key);
}

/** How a click selects: alone, extending from the anchor (Shift), or adding and removing one (⌘ or Ctrl). */
export interface ClickModifiers {
  isExtending?: boolean;
  isToggling?: boolean;
}

/** Only `key` selected, as a plain click selects it. */
export function selectOnly(key: string): Selection {
  return { keys: [key], anchor: key, focus: key };
}

/** A click on `key`, among the items as `order` shows them. */
export function clickSelect(
  selection: Selection,
  order: readonly string[],
  key: string,
  modifiers: ClickModifiers = {},
): Selection {
  if (modifiers.isExtending && selection.anchor && order.includes(selection.anchor)) {
    const from = order.indexOf(selection.anchor);
    const to = order.indexOf(key);
    const range = order.slice(Math.min(from, to), Math.max(from, to) + 1);
    const kept = modifiers.isToggling
      ? selection.keys.filter((selected) => !range.includes(selected))
      : [];
    return { keys: [...kept, ...range], anchor: selection.anchor, focus: key };
  }
  if (modifiers.isToggling) {
    const keys = isSelected(selection, key)
      ? selection.keys.filter((selected) => selected !== key)
      : [...selection.keys, key];
    return { keys, anchor: key, focus: key };
  }
  // A press on an item already selected keeps the others, so it can be dragged
  // with them; released without a drag, the view selects it alone.
  if (isSelected(selection, key)) return { ...selection, anchor: key, focus: key };
  return selectOnly(key);
}

export function selectAll(order: readonly string[]): Selection {
  return { keys: order.slice(), anchor: order[0] ?? null, focus: order.at(-1) ?? null };
}

/** The selection without items no longer shown (gone, renamed or filtered away). */
export function keepShown(selection: Selection, order: readonly string[]): Selection {
  const shown = new Set(order);
  const keys = selection.keys.filter((key) => shown.has(key));
  if (keys.length === selection.keys.length) return selection;
  const kept = (key: string | null) => (key && shown.has(key) ? key : (keys.at(-1) ?? null));
  return { keys, anchor: kept(selection.anchor), focus: kept(selection.focus) };
}

/**
 * An arrow key: the item `step` places away (±1 in a list; ±1 across and
 * ±columns down a grid), held at the ends; with Shift the selection extends
 * from the anchor to it. With nothing focused, the first (or the last, going
 * back) is selected. A step down a grid past its last row lands on the last
 * item, and up past its first row on the first, as Finder goes there.
 */
export function moveFocus(
  selection: Selection,
  order: readonly string[],
  step: number,
  isExtending = false,
): Selection {
  if (order.length === 0) return selection;
  const at = selection.focus ? order.indexOf(selection.focus) : -1;
  const next =
    at < 0 ? (step > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, at + step));
  const key = order[next];
  if (key === undefined) return selection;
  if (isExtending && selection.anchor && order.includes(selection.anchor)) {
    const from = order.indexOf(selection.anchor);
    return {
      keys: order.slice(Math.min(from, next), Math.max(from, next) + 1),
      anchor: selection.anchor,
      focus: key,
    };
  }
  return selectOnly(key);
}

/** Home and End: the first or the last item; with Shift, extending to it. */
export function focusEnd(
  selection: Selection,
  order: readonly string[],
  end: 'first' | 'last',
  isExtending = false,
): Selection {
  const key = end === 'first' ? order[0] : order.at(-1);
  if (key === undefined) return selection;
  if (isExtending && selection.anchor && order.includes(selection.anchor)) {
    const from = order.indexOf(selection.anchor);
    const to = end === 'first' ? 0 : order.length - 1;
    return {
      keys: order.slice(Math.min(from, to), Math.max(from, to) + 1),
      anchor: selection.anchor,
      focus: key,
    };
  }
  return selectOnly(key);
}

/** A rectangle in the view's own coordinates. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The rectangle from where a drag began to where it is now. */
export function boxBetween(from: { x: number; y: number }, to: { x: number; y: number }): Box {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

export function intersects(first: Box, second: Box): boolean {
  return (
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height
  );
}

/**
 * A rubber band over the items it `touched` (in the order shown): they flip
 * what was selected when it began if a modifier was held, else they alone are.
 */
export function bandSelect(
  before: Selection,
  touched: readonly string[],
  isAdding: boolean,
): Selection {
  const keys = isAdding
    ? [
        ...before.keys.filter((key) => !touched.includes(key)),
        ...touched.filter((key) => !before.keys.includes(key)),
      ]
    : touched.slice();
  if (keys.length === 0) return NO_SELECTION;
  return {
    keys,
    anchor: touched[0] ?? before.anchor,
    focus: touched.at(-1) ?? before.focus,
  };
}

/** Two presses this close together, on one item, are a double click. */
export const DOUBLE_CLICK_MS = 500;

/** The press a double click's second press follows: on which item, and when. */
export interface LastPress {
  key: string | null;
  at: number;
}

export const NO_PRESS: LastPress = { key: null, at: 0 };

/**
 * Whether a press on `key` at `at` (the press's own time, as the event carries
 * it, not when it was handled) is the second of a double click.
 */
export function isSecondClick(last: LastPress, key: string, at: number): boolean {
  return last.key === key && at >= last.at && at - last.at < DOUBLE_CLICK_MS;
}

/**
 * Typing a name's first letters selects the first item, in the order shown,
 * whose name begins with them, case and accents aside; with none, the first
 * that would come after them by name, as Finder's type-select does.
 */
export function typeSelect(
  shown: readonly { key: string; name: string }[],
  typed: string,
): string | null {
  const prefix = fold(typed);
  if (!prefix) return null;
  const starting = shown.find((item) => fold(item.name).startsWith(prefix));
  if (starting) return starting.key;
  const byName = shown.slice().sort((first, second) => compareNames(first.name, second.name));
  const after = byName.find((item) => compareNames(item.name, typed) > 0);
  return (after ?? byName.at(-1))?.key ?? null;
}

/** How long a pause ends what is being typed for type-select. */
export const TYPE_SELECT_PAUSE_MS = 1000;

/** The text type-select has after a key typed at `now`, given what was typed before and when. */
export function typedSoFar(
  previous: { text: string; at: number },
  key: string,
  now: number,
): { text: string; at: number } {
  const text = now - previous.at < TYPE_SELECT_PAUSE_MS ? previous.text + key : key;
  return { text, at: now };
}
