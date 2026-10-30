import { afterAll, describe, expect, mock, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Directory, File, pathsAt } from './node-file-system';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stash-folder-store-'));
mock.module('expo-file-system', () => ({ Directory, File, Paths: pathsAt(root) }));

const store = await import('@/lib/folder-store');
const uri = (relative: string) => encodeURI(`file://${path.join(root, relative)}`);
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('the folder store', () => {
  test('lists a folder, follows it while shown, and keeps its state while nothing changed', async () => {
    fs.mkdirSync(path.join(root, 'Shown'));
    fs.writeFileSync(path.join(root, 'Shown/a.txt'), 'a');
    let told = 0;
    const stop = store.subscribeFolder(uri('Shown'), () => told++);
    const first = store.getFolderState(uri('Shown'));
    expect(first.status === 'ready' && first.items.map((item) => item.name)).toEqual(['a.txt']);
    // Written with its slash, it is the same folder.
    expect(store.getFolderState(`${uri('Shown')}/`)).toBe(first);
    store.refreshFolder(uri('Shown'));
    expect(store.getFolderState(uri('Shown'))).toBe(first);
    fs.writeFileSync(path.join(root, 'Shown/b.txt'), 'b');
    await settle();
    expect(told).toBeGreaterThan(0);
    const next = store.getFolderState(uri('Shown'));
    expect(next.status === 'ready' && next.items.map((item) => item.name).sort()).toEqual(['a.txt', 'b.txt']);
    stop();
  });

  test('says a folder that went is missing', async () => {
    fs.mkdirSync(path.join(root, 'Gone'));
    const stop = store.subscribeFolder(uri('Gone'), () => {});
    fs.rmSync(path.join(root, 'Gone'), { recursive: true });
    store.refreshFolder(uri('Gone'));
    expect(store.getFolderState(uri('Gone'))).toEqual({ status: 'missing' });
    stop();
  });
});
