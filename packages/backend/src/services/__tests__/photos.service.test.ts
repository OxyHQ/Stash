import { describe, expect, test } from 'bun:test';
import sharp from 'sharp';
import { readPhoto, takenAtFromExif } from '../photos.service';

/** A JPEG `width`×`height`, three quarters orange and a quarter blue. */
async function photo(
  width: number,
  height: number,
  exif?: { orientation?: number; takenAt?: string; offset?: string },
): Promise<Uint8Array> {
  const blueWidth = Math.round(width / 4);
  let image = sharp({
    create: { width, height, channels: 3, background: '#e76f51' },
  })
    .composite([
      {
        input: { create: { width: blueWidth, height, channels: 3, background: '#1d3557' } },
        left: width - blueWidth,
        top: 0,
      },
    ])
    .jpeg();
  if (exif?.orientation) image = image.withMetadata({ orientation: exif.orientation });
  if (exif?.takenAt) {
    image = image.withExifMerge({
      IFD2: {
        DateTimeOriginal: exif.takenAt,
        ...(exif.offset ? { OffsetTimeOriginal: exif.offset } : {}),
      },
    });
  }
  return new Uint8Array(await image.toBuffer());
}

describe('readPhoto', () => {
  test('reads the size and ranks the dominant colour first', async () => {
    const facts = await readPhoto('asset', await photo(400, 300));
    expect(facts?.width).toBe(400);
    expect(facts?.height).toBe(300);
    expect(facts?.seeds.length).toBeGreaterThan(0);
    expect(facts?.seeds.length).toBeLessThanOrEqual(3);
    for (const seed of facts?.seeds ?? []) expect(seed).toMatch(/^#[0-9a-f]{6}$/);
    // The orange covers three quarters of the photo: its seed is warm (red
    // channel above blue), not the blue strip's.
    const [top] = facts?.seeds ?? [];
    const red = Number.parseInt(top?.slice(1, 3) ?? '00', 16);
    const blue = Number.parseInt(top?.slice(5, 7) ?? '00', 16);
    expect(red).toBeGreaterThan(blue);
  });

  test('reports the size a viewer sees when EXIF turns the photo a quarter', async () => {
    const facts = await readPhoto('asset', await photo(400, 300, { orientation: 6 }));
    expect([facts?.width, facts?.height]).toEqual([300, 400]);
  });

  test('is null for bytes that are not an image', async () => {
    expect(await readPhoto('asset', new TextEncoder().encode('not a photo'))).toBeNull();
  });

  test('reads when the photo was taken, in the zone the camera wrote', async () => {
    const withOffset = await readPhoto(
      'asset',
      await photo(64, 48, { takenAt: '2016:05:16 19:12:48', offset: '+02:00' }),
    );
    expect(withOffset?.takenAt?.toISOString()).toBe('2016-05-16T17:12:48.000Z');

    const noOffset = await readPhoto(
      'asset',
      await photo(64, 48, { takenAt: '2016:05:16 19:12:48' }),
    );
    expect(noOffset?.takenAt?.toISOString()).toBe('2016-05-16T19:12:48.000Z');

    expect((await readPhoto('asset', await photo(64, 48)))?.takenAt).toBeNull();
  });
});

describe('takenAtFromExif', () => {
  test('is null with no EXIF and for EXIF it cannot read', () => {
    expect(takenAtFromExif('asset', undefined)).toBeNull();
    expect(takenAtFromExif('asset', Buffer.from('garbage'))).toBeNull();
  });
});
