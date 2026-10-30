import { RiGalleryLine } from '@oxy.so/bloom/icons';
import { useLocalSearchParams } from 'expo-router';
import { Browser } from '@/components/Browser';
import { albumNamed, useAlbum, useAlbumItems, useAlbums } from '@/hooks/use-albums';
import { useLocale } from '@/hooks/use-locale';
import { useViewer } from '@/hooks/use-viewer';
import { formatDay } from '@/lib/format';
import { albumPhoto } from '@/lib/items';

/** One album's photos, newest first. */
export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { strings, locale } = useLocale();
  const { isSignedIn, isResolving } = useViewer();
  const albums = useAlbums();
  const album = useAlbum(id);
  const photos = useAlbumItems(id);
  const shownAlbum = album.data ?? albumNamed(albums.data, id);
  const items = (photos.data?.pages ?? []).flatMap((page) =>
    page.items.map((item) => albumPhoto(item, (time) => formatDay(time, locale))),
  );
  return (
    <Browser
      listing={{
        location: { kind: 'album', albumId: id },
        title: shownAlbum?.name ?? strings.albums,
        items,
        album: shownAlbum,
        status: !isSignedIn
          ? isResolving
            ? 'loading'
            : 'signed-out'
          : photos.isPending
            ? 'loading'
            : photos.isError
              ? 'error'
              : 'ready',
        layout: 'photos',
        empty: { icon: RiGalleryLine, title: strings.empty.album, hint: strings.empty.albumHint },
        onRetry: () => photos.refetch(),
        onEndReached: () => {
          if (photos.hasNextPage && !photos.isFetchingNextPage) photos.fetchNextPage();
        },
      }}
    />
  );
}
