/**
 * An item's icon, as Finder draws one: a folder as Stash's folder, an album
 * as a stack of photos, a document as a page with its kind's glyph, or a
 * picture as the picture itself, fitted into the icon's square.
 */
import {
  RiCodeSSlashLine,
  RiDiscLine,
  RiFileExcel2Line,
  RiFileImageLine,
  RiFileMusicLine,
  RiFilePdf2Line,
  RiFileTextLine,
  RiFileWord2Line,
  RiFileZipLine,
  RiFilmLine,
  RiGalleryLine,
  RiGalleryView,
  RiText,
} from '@oxy.so/bloom/icons';
import { useTheme } from '@oxy.so/bloom/theme';
import type { ComponentType } from 'react';
import { Image, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Kind } from '@/lib/kinds';

const FOLDER_IMAGE = require('@/assets/images/folder.png');

type Glyph = ComponentType<{ width?: number; height?: number; fill?: string }>;

const GLYPHS: Partial<Record<Kind, Glyph>> = {
  image: RiFileImageLine,
  audio: RiFileMusicLine,
  video: RiFilmLine,
  pdf: RiFilePdf2Line,
  text: RiFileTextLine,
  code: RiCodeSSlashLine,
  document: RiFileWord2Line,
  spreadsheet: RiFileExcel2Line,
  presentation: RiGalleryView,
  archive: RiFileZipLine,
  'disk-image': RiDiscLine,
  font: RiText,
};

/** A page with its top corner turned, its kind's glyph in the middle. */
function PageArt({ size, kind }: { size: number; kind: Kind }) {
  const theme = useTheme();
  const Glyph = GLYPHS[kind] ?? RiFileTextLine;
  const glyph = Math.round(size * 0.36);
  const paper = theme.isDark ? '#2c2c30' : '#ffffff';
  const edge = theme.isDark ? '#5a5a62' : '#c9c9cf';
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path
          d="M14 4h26l14 14v40a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
          fill={paper}
          stroke={edge}
          strokeWidth={1.2}
        />
        <Path d="M40 4v12a2 2 0 0 0 2 2h12" fill="none" stroke={edge} strokeWidth={1.2} />
      </Svg>
      <View className="absolute inset-x-0 items-center" style={{ top: size * 0.4 }}>
        <Glyph width={glyph} height={glyph} fill={theme.colors.textSecondary} />
      </View>
    </View>
  );
}

/** An album: photos stacked in the accent, or its cover when it has one. */
function AlbumArt({ size, coverUrl }: { size: number; coverUrl: string | null }) {
  const theme = useTheme();
  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={{ width: size, height: size, borderRadius: size * 0.14 }}
        resizeMode="cover"
        accessible={false}
      />
    );
  }
  const glyph = Math.round(size * 0.5);
  return (
    <View
      className="items-center justify-center bg-primary-subtle"
      style={{ width: size, height: size, borderRadius: size * 0.18 }}
    >
      <RiGalleryLine width={glyph} height={glyph} fill={theme.colors.primary} />
    </View>
  );
}

export interface ItemIconProps {
  kind: Kind;
  size: number;
  /** The picture to draw instead: a local file's URI or a resolved Oxy Files URL. */
  thumbnailUrl: string | null;
  /** Fill the square with the picture (Photos' grid) rather than fit it (Finder's icons). */
  isCropped?: boolean;
}

export function ItemIcon({ kind, size, thumbnailUrl, isCropped = false }: ItemIconProps) {
  if (kind === 'folder') {
    return (
      <Image
        source={FOLDER_IMAGE}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessible={false}
      />
    );
  }
  if (kind === 'album') return <AlbumArt size={size} coverUrl={thumbnailUrl} />;
  if (thumbnailUrl && (kind === 'image' || kind === 'video')) {
    return (
      <View className="items-center justify-center" style={{ width: size, height: size }}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={{ width: size, height: size, borderRadius: isCropped ? 0 : 4 }}
          resizeMode={isCropped ? 'cover' : 'contain'}
          accessible={false}
        />
      </View>
    );
  }
  return <PageArt size={size} kind={kind} />;
}
