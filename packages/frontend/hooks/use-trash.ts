import { usePlatformFiles } from '@oxy.so/bloom/platform-surface';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCloudFiles } from '@/hooks/use-cloud-files';
import { useViewer } from '@/hooks/use-viewer';
import { cloudTrashItem, localTrashItem, type TrashItem } from '@/lib/items';
import { hasLocalFiles } from '@/lib/local-files';

export const PLATFORM_TRASH_KEY = ['platform-trash'] as const;

/**
 * What both Trashes hold, as one list as Finder's Trash shows it: the
 * platform's (this device's files, followed as it changes) and Oxy Files'
 * (the signed-in person's). Each item says where it came from.
 */
export function useTrash() {
  const files = usePlatformFiles();
  const queryClient = useQueryClient();
  const { isSignedIn } = useViewer();
  const hasLocalTrash = files !== null && hasLocalFiles();
  const local = useQuery({
    queryKey: PLATFORM_TRASH_KEY,
    queryFn: async () => (files ? files.trashed() : []),
    enabled: hasLocalTrash,
  });
  const cloud = useCloudFiles('trash');

  useEffect(() => {
    if (!files) return undefined;
    return files.watchTrash(() => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_TRASH_KEY });
    });
  }, [files, queryClient]);

  const items: TrashItem[] = [
    ...(local.data ?? []).map(localTrashItem),
    ...(cloud.data?.pages ?? []).flatMap((page) => page.files.map(cloudTrashItem)),
  ];
  return {
    items,
    hasLocalTrash,
    hasCloudTrash: isSignedIn,
    isLoading: (hasLocalTrash && local.isPending) || (isSignedIn && cloud.isPending),
    isError: local.isError || cloud.isError,
    retry: () => {
      local.refetch();
      cloud.refetch();
    },
    hasMore: cloud.hasNextPage,
    loadMore: () => {
      if (cloud.hasNextPage && !cloud.isFetchingNextPage) cloud.fetchNextPage();
    },
  };
}
