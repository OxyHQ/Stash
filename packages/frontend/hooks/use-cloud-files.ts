import { useInfiniteQuery } from '@tanstack/react-query';
import { useViewer } from '@/hooks/use-viewer';
import { oxyServices } from '@/lib/oxy';

/** Assets per page of the library. */
const PAGE_SIZE = 100;

/** The query key of a person's Oxy Files, which a change to their files invalidates. */
export function cloudFilesKey(userId: string | null) {
  return ['oxy-files', userId] as const;
}

/**
 * The person's Oxy Files, newest first, a page at a time: the library
 * (`active`), or what is in its trash.
 */
export function useCloudFiles(status: 'active' | 'trash') {
  const { userId, isSignedIn } = useViewer();
  return useInfiniteQuery({
    queryKey: [...cloudFilesKey(userId), status],
    queryFn: ({ pageParam }) =>
      oxyServices.assets.list({
        limit: PAGE_SIZE,
        offset: pageParam,
        ...(status === 'trash' ? { status: 'trash' } : {}),
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * PAGE_SIZE : undefined),
    enabled: isSignedIn,
  });
}
