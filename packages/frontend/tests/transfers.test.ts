import { describe, expect, test } from 'bun:test';
import { overallProgress, planDownloads, planUploads } from '@/lib/transfers';
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
