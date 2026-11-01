import { describe, expect, test } from 'bun:test';
import { canMoveInto, dropAction, dropFolderFor } from '@/lib/drop';
import { cloud, folder, local } from './fixtures';

describe('dropping', () => {
  test('moves items only into a folder that is not one of them, inside one, or where they are', () => {
    const documents = folder('file:///home/ada/Documents');
    expect(canMoveInto([local('a.txt')], 'file:///home/ada/Documents')).toBe(true);
    expect(canMoveInto([documents], 'file:///home/ada/Documents')).toBe(false);
    expect(canMoveInto([documents], 'file:///home/ada/Documents/Taxes')).toBe(false);
    expect(
      canMoveInto(
        [local('a.txt', { uri: 'file:///home/ada/Documents/a.txt' })],
        'file:///home/ada/Documents/',
      ),
    ).toBe(false);
    expect(canMoveInto([], 'file:///home/ada/Documents')).toBe(false);
  });

  test('onto a folder moves local items, never cloud ones', () => {
    expect(
      dropAction([local('a.txt')], { kind: 'folder', uri: 'file:///home/ada/Documents' }),
    ).toBe('move');
    expect(
      dropAction([cloud('a.txt')], { kind: 'folder', uri: 'file:///home/ada/Documents' }),
    ).toBeNull();
  });

  test('onto Oxy Files uploads local files, but not folders', () => {
    expect(dropAction([local('a.txt'), local('b.png')], { kind: 'cloud' })).toBe('upload');
    expect(dropAction([folder('file:///home/ada/Documents')], { kind: 'cloud' })).toBeNull();
    expect(dropAction([cloud('a.txt')], { kind: 'cloud' })).toBeNull();
  });

  test('onto an album adds photos from either place, and nothing else', () => {
    const album = { kind: 'album', albumId: 'al1' } as const;
    expect(dropAction([local('a.jpg'), cloud('b.png', { mime: 'image/png' })], album)).toBe(
      'add-to-album',
    );
    expect(dropAction([local('a.jpg'), local('notes.md')], album)).toBeNull();
    expect(dropAction([], album)).toBeNull();
  });

  test('files dropped from another application go into the folder dropped on, else the folder shown', () => {
    const documents = folder('file:///home/ada/Documents');
    const home = { kind: 'folder' as const, uri: 'file:///home/ada' };
    expect(dropFolderFor(home, documents)).toBe('file:///home/ada/Documents');
    expect(dropFolderFor(home, local('a.txt'))).toBe('file:///home/ada');
    expect(dropFolderFor(home, null)).toBe('file:///home/ada');
    expect(dropFolderFor({ kind: 'trash' }, null)).toBeNull();
    expect(dropFolderFor({ kind: 'cloud' }, cloud('a.txt'))).toBeNull();
    expect(dropFolderFor({ kind: 'photos' }, documents)).toBe('file:///home/ada/Documents');
  });
});
