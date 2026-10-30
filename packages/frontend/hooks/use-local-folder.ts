import { useCallback, useSyncExternalStore } from 'react';
import { type FolderState, getFolderState, subscribeFolder } from '@/lib/folder-store';

/** What a folder on this device holds, following its changes while it is shown. */
export function useLocalFolder(uri: string): FolderState {
  const subscribe = useCallback((listener: () => void) => subscribeFolder(uri, listener), [uri]);
  const getSnapshot = useCallback(() => getFolderState(uri), [uri]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
