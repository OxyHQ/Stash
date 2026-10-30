import { describe, expect, test } from 'bun:test';
import {
  arrive,
  canGoBack,
  canGoForward,
  currentLocation,
  go,
  historyAt,
  nextLocation,
  previousLocation,
  replaceCurrent,
} from '@/lib/history';
import type { Location } from '@/lib/items';

const HOME: Location = { kind: 'folder', uri: 'file:///home/ada' };
const DOCUMENTS: Location = { kind: 'folder', uri: 'file:///home/ada/Documents' };

describe('history', () => {
  test('goes somewhere new, and going where it is changes nothing', () => {
    let history = historyAt(HOME);
    expect(canGoBack(history)).toBe(false);
    history = go(go(history, DOCUMENTS), { kind: 'trash' });
    expect(go(history, { kind: 'trash' })).toBe(history);
    expect(history.entries).toHaveLength(3);
  });

  test('arriving at the entry before or after is a step back or forward, not a new entry', () => {
    let history = go(go(historyAt(HOME), DOCUMENTS), { kind: 'cloud' });
    history = arrive(history, DOCUMENTS);
    expect(currentLocation(history)).toEqual(DOCUMENTS);
    expect(canGoForward(history)).toBe(true);
    expect(nextLocation(history)).toEqual({ kind: 'cloud' });
    history = arrive(history, { kind: 'cloud' });
    expect(history.index).toBe(2);
    expect(history.entries).toHaveLength(3);
  });

  test('arriving somewhere new forgets what was forward', () => {
    let history = arrive(go(go(historyAt(HOME), DOCUMENTS), { kind: 'trash' }), DOCUMENTS);
    history = arrive(history, { kind: 'album', albumId: 'x' });
    expect(canGoForward(history)).toBe(false);
    expect(previousLocation(history)).toEqual(DOCUMENTS);
    expect(history.entries).toHaveLength(3);
  });

  test('replacing the current entry leaves the rest', () => {
    const history = replaceCurrent(go(historyAt(HOME), DOCUMENTS), HOME);
    expect(history.entries).toEqual([HOME, HOME]);
    expect(history.index).toBe(1);
  });
});
