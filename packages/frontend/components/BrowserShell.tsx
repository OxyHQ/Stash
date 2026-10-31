/**
 * The window, Finder's, as Bloom's desktop window: the sidebar flush to the
 * window's leading edge with the window's controls at its top, and one pane
 * (the route's place) beside it, whose toolbar is the window's title area.
 * Where the platform has windows the sidebar stays in the window at every
 * size the window can take: it hides into the window's edge and peeks back
 * from it, never becoming a drawer, and the window is never made smaller than
 * the sidebar and the narrowest pane beside it. On a phone the sidebar is the
 * shell's drawer.
 */
import { AppShell } from '@oxy.so/bloom/app-shell';
import { useWindow, useWindowSizeLimits } from '@oxy.so/bloom/window';
import { Slot } from 'expo-router';
import { AlbumNameDialog } from '@/components/AlbumNameDialog';
import { useBrowser } from '@/components/BrowserProvider';
import { useAlbumActions } from '@/hooks/use-album-actions';
import { useLocale } from '@/hooks/use-locale';
import { useLocalPlaces } from '@/hooks/use-local-places';
import { useSidebarTree } from '@/hooks/use-sidebar-tree';
import { locationKey } from '@/lib/items';

const SIDEBAR_WIDTH = 220;
/**
 * The smallest window: the sidebar beside a pane whose toolbar still holds
 * its islands (the sidebar's toggle, back and forward, the view and a search
 * field) and two columns of icons, over a pane tall enough for a row of them
 * between the toolbar and the bars under it.
 */
const WINDOW_MIN = { minWidth: 640, minHeight: 400 };
/** The pane's inset from the window's edges; it starts at the window's top. */
const FRAME_INSET = { top: 0, end: 7, bottom: 7, start: 7 };

export function BrowserShell() {
  const { location, navigate, isNewAlbumOpen, setNewAlbumOpen } = useBrowser();
  const { strings } = useLocale();
  const { places } = useLocalPlaces();
  const { tree, locations } = useSidebarTree(places, () => setNewAlbumOpen(true));
  const albumActions = useAlbumActions();
  const isWindowed = useWindow() !== null;
  useWindowSizeLimits(WINDOW_MIN);
  return (
    <>
      <AppShell
        testID="stash"
        header={null}
        navigationAlign="content"
        navigationGap={0}
        contentMaxWidth="none"
        // A desktop window keeps its navigation in the window at any width
        // (Bloom's desktop window): it hides by its dock, never into a drawer.
        navFrom={isWindowed ? 0 : undefined}
        framedFrom={isWindowed ? 0 : undefined}
        frameInset={isWindowed ? FRAME_INSET : undefined}
        sidebar={{
          surface: 'plain',
          variant: 'panel',
          collapsed: false,
          collapseDisabled: true,
          width: SIDEBAR_WIDTH,
          // Finder's sidebar starts with its sections, under the window's controls.
          header: isWindowed ? false : undefined,
          showSearch: false,
          showThemeToggle: false,
          tree,
          selectedTreeItem: location ? locationKey(location) : undefined,
          onTreeItemPress: (item) => {
            const target = locations.get(item.key);
            if (target) navigate(target);
          },
          dock: isWindowed ? { peek: true } : undefined,
        }}
        panelLayout={{
          mode: 'split',
          flow: 'bounded',
          panels: [{ id: 'browser', content: <Slot /> }],
        }}
      />
      {isNewAlbumOpen ? (
        <AlbumNameDialog
          isOpen
          title={strings.menus.newAlbum}
          initialName={strings.untitledAlbum}
          confirmLabel={strings.save}
          onConfirm={(name) => {
            albumActions.create(name).then(
              (album) => {
                if (album) navigate({ kind: 'album', albumId: album.id });
              },
              (error: unknown) => console.warn('Stash could not make an album', error),
            );
          }}
          onClose={() => setNewAlbumOpen(false)}
        />
      ) : null}
    </>
  );
}
