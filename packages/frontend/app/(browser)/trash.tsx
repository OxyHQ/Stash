import { RiDeleteBinLine } from '@oxy.so/bloom/icons';
import { Browser } from '@/components/Browser';
import { useLocale } from '@/hooks/use-locale';
import { useTrash } from '@/hooks/use-trash';
import { useViewer } from '@/hooks/use-viewer';

/** Both Trashes in one list, as Finder's: this device's and Oxy Files', each item saying where it was. */
export default function TrashScreen() {
  const { strings } = useLocale();
  const trash = useTrash();
  const { isResolving } = useViewer();
  // With no Trash on this device, the Trash is Oxy Files': signing in shows it.
  const hasTrash = trash.hasLocalTrash || trash.hasCloudTrash;
  return (
    <Browser
      listing={{
        location: { kind: 'trash' },
        title: strings.trash,
        items: trash.items,
        status: !hasTrash
          ? isResolving
            ? 'loading'
            : 'signed-out'
          : trash.isLoading
            ? 'loading'
            : trash.isError && trash.items.length === 0
              ? 'error'
              : 'ready',
        layout: 'files',
        empty: { icon: RiDeleteBinLine, title: strings.empty.trash },
        onRetry: trash.retry,
        onEndReached: trash.loadMore,
      }}
    />
  );
}
