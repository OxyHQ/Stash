/**
 * The window, Finder's: Bloom's AppShell with its sidebar (under the window's
 * controls where the platform has windows, a drawer on a phone) and one pane,
 * the route's place.
 */
import { AppShell } from '@oxy.so/bloom/app-shell';
import { Slot } from 'expo-router';
import { AlbumNameDialog } from '@/components/AlbumNameDialog';
import { useBrowser } from '@/components/BrowserProvider';
import { useAlbumActions } from '@/hooks/use-album-actions';
import { useLocale } from '@/hooks/use-locale';
import { useLocalPlaces } from '@/hooks/use-local-places';
import { useSidebarTree } from '@/hooks/use-sidebar-tree';
import { locationKey } from '@/lib/items';

const SIDEBAR_WIDTH = 220;

export function BrowserShell() {
  const { location, navigate, isNewAlbumOpen, setNewAlbumOpen } = useBrowser();
  const { strings } = useLocale();
  const { places } = useLocalPlaces();
  const { tree, locations } = useSidebarTree(places, () => setNewAlbumOpen(true));
  const albumActions = useAlbumActions();
  return (
    <>
      <AppShell
        testID="stash"
        header={null}
        navigationAlign="content"
        navigationGap={0}
        contentMaxWidth="none"
        sidebar={{
          surface: 'plain',
          variant: 'panel',
          collapsed: false,
          collapseDisabled: true,
          width: SIDEBAR_WIDTH,
          showSearch: false,
          showThemeToggle: false,
          tree,
          selectedTreeItem: location ? locationKey(location) : undefined,
          onTreeItemPress: (item) => {
            const target = locations.get(item.key);
            if (target) navigate(target);
          },
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
