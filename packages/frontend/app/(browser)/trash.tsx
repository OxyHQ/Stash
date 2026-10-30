import { RiDeleteBinLine } from '@oxy.so/bloom/icons';
import { Browser } from '@/components/Browser';
import { useLocale } from '@/hooks/use-locale';
import { useTrash } from '@/hooks/use-trash';

/** Both Trashes in one list, as Finder's: this device's and Oxy Files', each item saying where it was. */
export default function TrashScreen() {
  const { strings } = useLocale();
  const trash = useTrash();
  return (
    <Browser
      listing={{
        location: { kind: 'trash' },
        title: strings.trash,
        items: trash.items,
        status: trash.isLoading
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
