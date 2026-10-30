import { RiImageLine } from '@oxy.so/bloom/icons';
import { Browser } from '@/components/Browser';
import { useCloudFiles } from '@/hooks/use-cloud-files';
import { useLocale } from '@/hooks/use-locale';
import { useViewer } from '@/hooks/use-viewer';
import { cloudItem, isVisualMedia } from '@/lib/items';

/** The photos and videos in the person's Oxy Files, newest first, as Photos shows them. */
export default function PhotosScreen() {
  const { strings } = useLocale();
  const { isSignedIn, isResolving } = useViewer();
  const files = useCloudFiles('active');
  const items = (files.data?.pages ?? [])
    .flatMap((page) => page.files.filter((asset) => asset.status === 'active').map(cloudItem))
    .filter(isVisualMedia);
  return (
    <Browser
      listing={{
        location: { kind: 'photos' },
        title: strings.photos,
        items,
        status: !isSignedIn
          ? isResolving
            ? 'loading'
            : 'signed-out'
          : files.isPending
            ? 'loading'
            : files.isError
              ? 'error'
              : 'ready',
        layout: 'photos',
        empty: { icon: RiImageLine, title: strings.empty.photos, hint: strings.empty.photosHint },
        onRetry: () => files.refetch(),
        onEndReached: () => {
          if (files.hasNextPage && !files.isFetchingNextPage) files.fetchNextPage();
        },
      }}
    />
  );
}
