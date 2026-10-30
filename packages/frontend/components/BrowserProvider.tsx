/**
 * The window's own state, kept across the places it shows: where it is (the
 * route) and was (back and forward), how it shows items (icons or a list,
 * per kind of place), their order, whether hidden files show, and the album
 * name dialog the sidebar and the menus open.
 */
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { createContext, type ReactNode, use, useState } from 'react';
import {
  arrive,
  canGoBack,
  canGoForward,
  currentLocation,
  type History,
  historyAt,
  nextLocation,
} from '@/lib/history';
import { type Location, sameLocation } from '@/lib/items';
import { hrefFor, locationFromRoute } from '@/lib/routes';
import { NAME_ORDER, type SortOrder } from '@/lib/sorting';

export type ViewMode = 'icons' | 'list';

/** Photos and albums are a grid of pictures by default; files are Finder's icons or list. */
type ViewFamily = 'files' | 'media';

function familyOf(location: Location): ViewFamily {
  return location.kind === 'photos' || location.kind === 'albums' || location.kind === 'album'
    ? 'media'
    : 'files';
}

interface BrowserValue {
  location: Location | null;
  history: History | null;
  navigate: (location: Location) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  viewModeFor: (location: Location) => ViewMode;
  setViewMode: (location: Location, mode: ViewMode) => void;
  orderFor: (location: Location) => SortOrder;
  setOrder: (location: Location, order: SortOrder) => void;
  isShowingHidden: boolean;
  setShowingHidden: (isShowing: boolean) => void;
  isNewAlbumOpen: boolean;
  setNewAlbumOpen: (isOpen: boolean) => void;
}

const BrowserContext = createContext<BrowserValue | null>(null);

export function BrowserProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const location = locationFromRoute(pathname, params);
  const [history, setHistory] = useState<History | null>(() =>
    location ? historyAt(location) : null,
  );
  const [viewModes, setViewModes] = useState<Record<ViewFamily, ViewMode>>({
    files: 'icons',
    media: 'icons',
  });
  // Files by name, as Finder starts; photos newest first, as Photos does.
  const [orders, setOrders] = useState<Record<ViewFamily, SortOrder>>({
    files: NAME_ORDER,
    media: { column: 'date', direction: 'descending' },
  });
  const [isShowingHidden, setShowingHidden] = useState(false);
  const [isNewAlbumOpen, setNewAlbumOpen] = useState(false);

  // The route is where the window is; the history follows it however it got
  // there (a press here, the browser's own back, a phone's back gesture).
  const current = history ? currentLocation(history) : null;
  if (location && (!current || !sameLocation(current, location))) {
    setHistory(history ? arrive(history, location) : historyAt(location));
  }

  const value: BrowserValue = {
    location,
    history,
    navigate: (next) => {
      if (location && sameLocation(location, next)) return;
      router.push(hrefFor(next));
    },
    goBack: () => {
      if (history && canGoBack(history)) router.back();
    },
    goForward: () => {
      const next = history ? nextLocation(history) : null;
      if (next) router.push(hrefFor(next));
    },
    canGoBack: history !== null && canGoBack(history),
    canGoForward: history !== null && canGoForward(history),
    viewModeFor: (place) => viewModes[familyOf(place)],
    setViewMode: (place, mode) => setViewModes((modes) => ({ ...modes, [familyOf(place)]: mode })),
    orderFor: (place) => orders[familyOf(place)],
    setOrder: (place, next) => setOrders((current) => ({ ...current, [familyOf(place)]: next })),
    isShowingHidden,
    setShowingHidden,
    isNewAlbumOpen,
    setNewAlbumOpen,
  };
  return <BrowserContext value={value}>{children}</BrowserContext>;
}

export function useBrowser(): BrowserValue {
  const value = use(BrowserContext);
  if (!value) throw new Error('useBrowser needs a BrowserProvider above it');
  return value;
}
