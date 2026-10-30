import { describe, expect, test } from 'bun:test';
import {
  compareNames,
  freeFileName,
  freeName,
  nameProblem,
  nameSelection,
  splitExtension,
} from '@/lib/names';

describe('names', () => {
  test('sort as Finder sorts them: case and accents aside, numbers by value', () => {
    const names = [
      'report 10.pdf',
      'Report 9.pdf',
      'apple',
      'Éclair',
      'eclair',
      'file02',
      'file1',
      'Zebra',
      'ábaco',
    ];
    expect(names.slice().sort(compareNames)).toEqual([
      'ábaco',
      'apple',
      'eclair',
      'Éclair',
      'file1',
      'file02',
      'Report 9.pdf',
      'report 10.pdf',
      'Zebra',
    ]);
  });

  test('have a total order: names equal but for case still compare unequal', () => {
    expect(compareNames('A', 'a')).not.toBe(0);
    expect(compareNames('same', 'same')).toBe(0);
    expect(Math.sign(compareNames('a', 'A'))).toBe(-Math.sign(compareNames('A', 'a')));
  });

  test('are refused with the reason a person is told', () => {
    expect(nameProblem('', [])).toBe('empty');
    expect(nameProblem('   ', [])).toBe('empty');
    expect(nameProblem('a/b', [])).toBe('slash');
    expect(nameProblem('nul\0', [])).toBe('slash');
    expect(nameProblem('.', [])).toBe('dots');
    expect(nameProblem('..', [])).toBe('dots');
    expect(nameProblem('x'.repeat(256), [])).toBe('too-long');
    // Two bytes each in UTF-8: 128 of them are 256 bytes.
    expect(nameProblem('ñ'.repeat(128), [])).toBe('too-long');
    expect(nameProblem('Notes.md', ['notes.md'])).toBe('taken');
  });

  test('are taken when they can be used', () => {
    for (const name of ['notes.md', '.hidden', 'x'.repeat(255), 'ñ'.repeat(127), 'Año 2026']) {
      expect(nameProblem(name, ['other'])).toBeNull();
    }
  });

  test('of a new folder take the first free number', () => {
    expect(freeName('untitled folder', ['Documents'])).toBe('untitled folder');
    expect(freeName('untitled folder', ['Untitled Folder', 'untitled folder 2'])).toBe(
      'untitled folder 3',
    );
  });

  test('of a download keep the extension and number the stem', () => {
    expect(freeFileName('photo.jpg', ['other.jpg'])).toBe('photo.jpg');
    expect(freeFileName('photo.jpg', ['Photo.JPG', 'photo 2.jpg'])).toBe('photo 3.jpg');
    expect(freeFileName('README', ['README'])).toBe('README 2');
    expect(freeFileName('.env', ['.env'])).toBe('.env 2');
  });

  test('select the stem first when renamed, the whole name of a folder', () => {
    expect(splitExtension('report.final.pdf')).toEqual({ stem: 'report.final', extension: '.pdf' });
    expect(nameSelection('report.final.pdf', false)).toEqual({ start: 0, end: 12 });
    expect(nameSelection('.bashrc', false)).toEqual({ start: 0, end: 7 });
    expect(nameSelection('trailing.', false)).toEqual({ start: 0, end: 9 });
    expect(nameSelection('v1.2', true)).toEqual({ start: 0, end: 4 });
  });
});
