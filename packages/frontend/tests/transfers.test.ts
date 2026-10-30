import { describe, expect, test } from 'bun:test';
import { downloadableOf, overallProgress, planDownloads, planUploads } from '@/lib/transfers';
import { cloud, folder, local } from './fixtures';

describe('uploads', () => {
  test('send each local file with its name, type and size, and leave folders out', () => {
    const plan = planUploads([
      local('IMG_0001.JPG', { size: 2000 }),
      folder('file:///home/ada/Documents'),
      local('notes.md', { size: null }),
    ]);
    expect(plan.uploads).toEqual([
      {
        uri: 'file:///home/ada/IMG_0001.JPG',
        name: 'IMG_0001.JPG',
        type: 'image/jpeg',
        size: 2000,
      },
      { uri: 'file:///home/ada/notes.md', name: 'notes.md', type: 'text/markdown' },
    ]);
    expect(plan.skippedFolders.map((item) => item.name)).toEqual(['Documents']);
  });
});

describe('downloads', () => {
  test('never replace an item in the folder, nor one another', () => {
    const steps = planDownloads(
      [
        cloud('photo.jpg', { assetId: 'a' }),
        cloud('photo.jpg', { assetId: 'b' }),
        cloud('notes.md', { assetId: 'c' }),
      ],
      ['Photo.jpg'],
    );
    expect(steps).toEqual([
      { assetId: 'a', fileName: 'photo 2.jpg' },
      { assetId: 'b', fileName: 'photo 3.jpg' },
      { assetId: 'c', fileName: 'notes.md' },
    ]);
  });
});

describe('progress', () => {
  test('weighs each transfer by its size when every size is known', () => {
    expect(
      overallProgress([
        { fraction: 1, size: 100 },
        { fraction: 0, size: 300 },
      ]),
    ).toBe(0.25);
  });

  test('averages the transfers when a size is unknown', () => {
    expect(
      overallProgress([
        { fraction: 1, size: null },
        { fraction: 0, size: 300 },
      ]),
    ).toBe(0.5);
    expect(overallProgress([])).toBe(0);
  });
});

describe('what downloads', () => {
  test('an Oxy Files file as itself, an album photo by its date with its extension, nothing else', () => {
    const file = cloud('notes.md');
    expect(downloadableOf(file)).toBe(file);
    const photo = {
      source: 'album-photo',
      key: 'album-item:i1',
      albumId: 'al1',
      itemId: 'i1',
      assetId: 'a1',
      name: '2 Jan 2026',
      isFolder: false,
      size: null,
      modifiedAt: 1,
      isHidden: false,
      mime: 'image/jpeg',
      width: 1,
      height: 1,
      seeds: [],
    } as const;
    expect(downloadableOf(photo)).toEqual({ assetId: 'a1', name: '2 Jan 2026.jpg', size: null });
    expect(downloadableOf({ ...photo, mime: 'application/x-unknown' })?.name).toBe('2 Jan 2026');
    expect(downloadableOf(local('a.txt'))).toBeNull();
  });
});
