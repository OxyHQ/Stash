import { RiCloudLine } from '@oxy.so/bloom/icons';
import { Browser } from '@/components/Browser';
import { useCloudFiles } from '@/hooks/use-cloud-files';
import { useLocale } from '@/hooks/use-locale';
import { useViewer } from '@/hooks/use-viewer';
import { cloudItem } from '@/lib/items';

/** The person's Oxy Files, as a library: no folders, as Oxy Files has none. */
export default function CloudScreen() {
  const { strings } = useLocale();
  const { isSignedIn, isResolving } = useViewer();
  const files = useCloudFiles('active');
  const items = (files.data?.pages ?? []).flatMap((page) =>
    page.files.filter((asset) => asset.status === 'active').map(cloudItem),
  );
  return (
    <Browser
      listing={{
        location: { kind: 'cloud' },
        title: strings.cloud,
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
        layout: 'files',
        empty: { icon: RiCloudLine, title: strings.empty.cloud, hint: strings.empty.cloudHint },
        onRetry: () => files.refetch(),
        onEndReached: () => {
          if (files.hasNextPage && !files.isFetchingNextPage) files.fetchNextPage();
        },
      }}
    />
  );
}
