/**
 * One place's pane: the menus, the toolbar, the items and the line under
 * them, and the dialogs that ask before what cannot be undone. Every place
 * (a folder on this device, Oxy Files, Photos, the albums, an album, the
 * Trash) is shown by this one component from its listing; only what the
 * listing holds and what can be done to it differ.
 */
import { AlertDialog } from '@oxy.so/bloom/alert-dialog';
import { EmptyState } from '@oxy.so/bloom/empty-state';
import type { BloomIconComponent } from '@oxy.so/bloom/icons';
import { Loading } from '@oxy.so/bloom/loading';
import { usePlatformMenuBar } from '@oxy.so/bloom/platform-surface';
import { useWindow } from '@oxy.so/bloom/window';
import type { Album } from '@stash/shared-types';
import { useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { AlbumNameDialog } from '@/components/AlbumNameDialog';
import { BrowserMenus } from '@/components/BrowserMenus';
import { useBrowser } from '@/components/BrowserProvider';
import { BackgroundMenuRows, ItemMenuRows } from '@/components/ItemMenus';
import { ItemsView } from '@/components/ItemsView';
import { PreviewDialog } from '@/components/PreviewDialog';
import { SignInPanel } from '@/components/SignInPanel';
import { StatusBar } from '@/components/StatusBar';
import { Toolbar } from '@/components/Toolbar';
import { useAlbums } from '@/hooks/use-albums';
import { type AssetUrlRequest, assetUrlKey, useAssetUrls } from '@/hooks/use-asset-urls';
import { useBrowserKeys } from '@/hooks/use-browser-keys';
import { type ConfirmRequest, useCommands } from '@/hooks/use-commands';
import { useLocale } from '@/hooks/use-locale';
import { useLocalPlaces } from '@/hooks/use-local-places';
import { previewOnPlatform } from '@/lib/local-files';
import { type Item, itemKind, type LocalItem, type Location } from '@/lib/items';
import { gridColumns, type ItemsLayout } from '@/lib/items-layout';
import { isSameUri, parentUri, pathParts, placeOf, uriName } from '@/lib/local-places';
import { isSelected, keepShown, NO_SELECTION, type Selection, selectAll } from '@/lib/selection';
import { sortBy, sortItems, visibleItems } from '@/lib/sorting';

/** A picture larger than this is not decoded for an icon: its kind's glyph is drawn instead. */
const THUMBNAIL_MAX_BYTES = 24 * 1024 * 1024;
/** A window this wide draws its menu bar where the platform has none of its own. */
const MENU_BAR_FROM = 640;

/** What a place shows, and how. */
export interface Listing {
  location: Location;
  title: string;
  items: readonly Item[];
  status: 'ready' | 'loading' | 'error' | 'signed-out';
  layout: ItemsLayout;
  empty: { icon: BloomIconComponent; title: string; hint?: string };
  /** The album the place is, when it is one. */
  album?: Album | null;
  onRetry?: () => void;
  onEndReached?: () => void;
}

/** What a picture in the view is drawn from: a local file itself, or an asset's URL. */
function thumbnailSource(item: Item): { uri: string } | AssetUrlRequest | null {
  const kind = itemKind(item);
  if (kind !== 'image' && kind !== 'video') return null;
  switch (item.source) {
    case 'local':
      return kind === 'image' && item.size !== null && item.size <= THUMBNAIL_MAX_BYTES
        ? { uri: item.uri }
        : null;
    case 'cloud':
      if (item.hasThumbnail) return { assetId: item.assetId, variant: 'thumb' };
      return kind === 'image' && item.size !== null && item.size <= THUMBNAIL_MAX_BYTES
        ? { assetId: item.assetId }
        : null;
    case 'album-photo':
      return { assetId: item.assetId, variant: 'thumb' };
    default:
      return null;
  }
}

export function Browser({ listing }: { listing: Listing }) {
  const { location, items } = listing;
  const browser = useBrowser();
  const { strings } = useLocale();
  const { places } = useLocalPlaces();
  const albums = useAlbums();
  const platformWindow = useWindow();
  const platformMenuBar = usePlatformMenuBar();
  const window = useWindowDimensions();
  const isWindowActive = platformWindow ? platformWindow.active : true;

  const [rawSelection, setSelection] = useState<Selection>(NO_SELECTION);
  const [search, setSearch] = useState('');
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<Item | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [albumBeingRenamed, setAlbumBeingRenamed] = useState<Album | null>(null);
  const [nameProblem, setNameProblem] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  // The name being typed in place, kept here so a press elsewhere keeps it as
  // Return does (Finder's rename ends either way), and only once.
  const renaming = useRef<{ key: string; text: string } | null>(null);

  const viewMode = browser.viewModeFor(location);
  const order = browser.orderFor(location);
  const shown = sortItems(visibleItems(items, search, browser.isShowingHidden), order);
  const shownKeys = shown.map((item) => item.key);
  // Items gone, renamed or searched away leave the selection.
  const selection = keepShown(rawSelection, shownKeys);
  const selected = shown.filter((item) => isSelected(selection, item.key));
  const handleSelectionChange = (change: (current: Selection) => Selection) =>
    setSelection((current) => change(keepShown(current, shownKeys)));

  const sources = shown.map((item) => ({ item, source: thumbnailSource(item) }));
  const urlRequests = sources.flatMap(({ source }) =>
    source && 'assetId' in source ? [source] : [],
  );
  const urls = useAssetUrls(urlRequests);
  const thumbnails = new Map<string, string>();
  for (const { item, source } of sources) {
    if (!source) continue;
    const url = 'assetId' in source ? urls.get(assetUrlKey(source)) : source.uri;
    if (url) thumbnails.set(item.key, url);
  }

  const originOf = (item: Item): string => {
    if (item.source === 'cloud-trash') return strings.origins.cloud;
    if (item.source !== 'local-trash') return '';
    if (!item.originalUri) return strings.origins.unknown;
    const folder = parentUri(item.originalUri);
    const place = places.find((each) => isSameUri(each.uri, folder));
    return place ? place.name : uriName(folder);
  };

  const preview = (item: Item) => {
    if (item.source === 'local') {
      previewOnPlatform(item).then(
        (isShown) => {
          if (!isShown) setPreviewItem(item);
        },
        (error: unknown) => {
          console.warn('The platform could not preview a file; Stash shows it', {
            uri: item.uri,
            error,
          });
          setPreviewItem(item);
        },
      );
      return;
    }
    setPreviewItem(item);
  };

  const commands = useCommands({
    location,
    shown,
    selected,
    places,
    albums: albums.data ?? [],
    album: listing.album ?? null,
    navigate: browser.navigate,
    preview,
    startRename: (item: LocalItem) => startRename(item),
    confirm: setConfirm,
    renameAlbum: setAlbumBeingRenamed,
    newAlbum: () => browser.setNewAlbumOpen(true),
    setSelection: (next) => setSelection(next),
    selectAll: () => setSelection(selectAll(shownKeys)),
  });

  const startRename = (item: LocalItem) => {
    renaming.current = { key: item.key, text: item.name };
    setRenamingKey(item.key);
  };
  const cancelRename = () => {
    renaming.current = null;
    setRenamingKey(null);
  };
  const commitRename = () => {
    const pending = renaming.current;
    if (!pending) return;
    cancelRename();
    const item = items.find((each) => each.key === pending.key);
    if (item?.source !== 'local' || pending.text === item.name) return;
    const result = commands.renameLocal(item, pending.text);
    if ('item' in result) {
      setSelection({ keys: [result.item.key], anchor: result.item.key, focus: result.item.key });
      return;
    }
    setNameProblem(
      result.why.kind === 'name'
        ? strings.nameProblems[result.why.problem]
        : strings.fileProblems[result.why.problem],
    );
  };

  useBrowserKeys({
    isEnabled: isWindowActive && confirm === null,
    viewMode,
    columns: gridColumns(width, listing.layout),
    shown,
    onSelectionChange: handleSelectionChange,
    commands,
    isPreviewOpen: previewItem !== null,
    onTogglePreview: () => {
      if (previewItem) setPreviewItem(null);
      else commands.preview.run();
    },
    isRenaming: renamingKey !== null,
    onCancelRename: cancelRename,
  });

  const path = location.kind === 'folder' ? pathParts(location.uri, places) : [];
  const enclosing: Location | null =
    location.kind === 'folder' && path.length > 1
      ? { kind: 'folder', uri: parentUri(location.uri) }
      : location.kind === 'album'
        ? { kind: 'albums' }
        : null;
  const isAtPlace =
    location.kind === 'folder' && placeOf(location.uri, places)?.uri === location.uri;

  const statusText =
    selected.length > 0
      ? strings.selected(selected.length, shown.length)
      : strings.items(shown.length);

  const emptyState =
    listing.status === 'ready' ? (
      <EmptyState
        variant="compact"
        icon={listing.empty.icon}
        title={search ? strings.empty.noResults(search) : listing.empty.title}
        description={search ? undefined : listing.empty.hint}
      />
    ) : null;

  // What assistive technology can do to an item: one list for the items alike,
  // so an item draws again only when its own list changes.
  const openActions = [
    { name: 'activate', label: strings.menus.open },
    { name: 'select', label: strings.select },
  ];
  const trashAction =
    location.kind === 'trash'
      ? { name: 'trash', label: strings.menus.putBack }
      : { name: 'trash', label: strings.menus.moveToTrash };
  const localActions = [
    ...openActions,
    ...(location.kind === 'folder' ? [{ name: 'rename', label: strings.menus.rename }] : []),
    ...(location.kind === 'trash' || commands.hasPlatformTrash ? [trashAction] : []),
  ];
  const cloudActions = [...openActions, trashAction];
  const otherActions = location.kind === 'trash' ? cloudActions : openActions;
  const itemActions = (item: Item) =>
    item.source === 'local' ? localActions : item.source === 'cloud' ? cloudActions : otherActions;

  const body =
    listing.status === 'signed-out' ? (
      <View className="flex-1 justify-center">
        <SignInPanel />
      </View>
    ) : listing.status === 'loading' ? (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    ) : listing.status === 'error' ? (
      <View className="flex-1 items-center justify-center">
        <EmptyState
          title={strings.couldNotLoad}
          action={listing.onRetry ? { label: strings.retry, onPress: listing.onRetry } : undefined}
        />
      </View>
    ) : (
      <ItemsView
        items={shown}
        mode={viewMode}
        layout={listing.layout}
        label={listing.title}
        selection={selection}
        onSelectionChange={handleSelectionChange}
        isWindowActive={isWindowActive}
        thumbnails={thumbnails}
        renamingKey={renamingKey}
        onRenameText={(text) => {
          if (renaming.current) renaming.current.text = text;
        }}
        onRenameDone={commitRename}
        order={order}
        onSort={(column) => browser.setOrder(location, sortBy(order, column))}
        dateColumn={
          location.kind === 'trash' ? 'deleted' : listing.layout === 'photos' ? 'taken' : 'date'
        }
        hasOriginColumn={location.kind === 'trash'}
        originOf={originOf}
        onOpen={commands.openItem}
        canDrop={commands.canDrop}
        onDrop={commands.drop}
        onAction={(item, action) => {
          if (action === 'activate') commands.openItem(item);
          else if (action === 'select') {
            handleSelectionChange((current) =>
              isSelected(current, item.key)
                ? { ...current, keys: current.keys.filter((key) => key !== item.key) }
                : { keys: [...current.keys, item.key], anchor: item.key, focus: item.key },
            );
          } else if (action === 'rename' && item.source === 'local') {
            setSelection({ keys: [item.key], anchor: item.key, focus: item.key });
            startRename(item);
          } else if (action === 'trash') {
            setSelection({ keys: [item.key], anchor: item.key, focus: item.key });
            if (location.kind === 'trash') commands.putBack.run();
            else commands.moveToTrash.run();
          }
        }}
        itemActions={itemActions}
        itemMenu={(item) => <ItemMenuRows item={item} commands={commands} />}
        backgroundMenu={
          <BackgroundMenuRows
            commands={commands}
            location={location}
            viewMode={viewMode}
            onViewMode={(mode) => browser.setViewMode(location, mode)}
          />
        }
        emptyState={emptyState}
        onWidthChange={setWidth}
        onEndReached={listing.onEndReached}
      />
    );

  const confirmTitle = (() => {
    if (!confirm) return '';
    switch (confirm.kind) {
      case 'empty-trash':
        return strings.confirm.emptyTrash(location.kind === 'trash' ? items.length : 0);
      case 'erase':
        return strings.confirm.deleteImmediately(confirm.items.length);
      case 'delete-for-good':
        return strings.confirm.deleteForGood(confirm.items.length);
      case 'delete-album':
        return strings.confirm.deleteAlbum(confirm.album.name);
    }
  })();

  // Where the platform has a menu bar the menus are described to it and draw
  // nothing here; elsewhere a wide window draws them above the toolbar.
  const menus = (
    <BrowserMenus
      commands={commands}
      location={location}
      places={places}
      viewMode={viewMode}
      onViewMode={(mode) => browser.setViewMode(location, mode)}
      order={order}
      onSortColumn={(column) =>
        browser.setOrder(location, order.column === column ? order : sortBy(order, column))
      }
      isShowingHidden={browser.isShowingHidden}
      onShowingHidden={browser.setShowingHidden}
      canGoBack={browser.canGoBack}
      canGoForward={browser.canGoForward}
      onBack={browser.goBack}
      onForward={browser.goForward}
      onEnclosing={enclosing ? () => browser.navigate(enclosing) : null}
      onGo={browser.navigate}
    />
  );

  return (
    <View className="flex-1" testID="browser">
      {platformMenuBar ? (
        menus
      ) : window.width >= MENU_BAR_FROM ? (
        <View className="flex-row px-2 pt-2">{menus}</View>
      ) : null}
      <Toolbar
        title={listing.title}
        path={isAtPlace ? [] : path}
        onPath={(uri) => browser.navigate({ kind: 'folder', uri })}
        viewMode={viewMode}
        onViewMode={(mode) => browser.setViewMode(location, mode)}
        search={search}
        onSearch={setSearch}
        canGoBack={browser.canGoBack}
        canGoForward={browser.canGoForward}
        onBack={browser.goBack}
        onForward={browser.goForward}
        onUpload={
          location.kind === 'cloud' && commands.uploadPicked.isEnabled
            ? commands.uploadPicked.run
            : null
        }
        width={width}
      />
      {body}
      {listing.status === 'ready' ? <StatusBar text={statusText} /> : null}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setConfirm(null);
        }}
        title={confirmTitle}
        description={
          confirm?.kind === 'delete-album'
            ? strings.confirm.deleteAlbumBody
            : strings.confirm.cannotUndo
        }
        confirmLabel={
          confirm?.kind === 'empty-trash'
            ? strings.confirm.emptyTrashAction
            : confirm?.kind === 'delete-album'
              ? strings.confirm.deleteAlbumAction
              : strings.confirm.deleteAction
        }
        cancelLabel={strings.cancel}
        destructive
        onConfirm={() => {
          if (confirm) commands.confirmed(confirm);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
        testID="confirm"
      />
      <AlertDialog
        open={nameProblem !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setNameProblem(null);
        }}
        title={nameProblem ?? ''}
        confirmLabel={strings.ok}
        hideCancel
        onConfirm={() => setNameProblem(null)}
        testID="name-problem"
      />
      <PreviewDialog
        item={previewItem}
        origin={previewItem ? originOf(previewItem) || null : null}
        onClose={() => setPreviewItem(null)}
      />
      {albumBeingRenamed ? (
        <AlbumNameDialog
          key={albumBeingRenamed.id}
          isOpen
          title={strings.renameAlbumTitle}
          initialName={albumBeingRenamed.name}
          confirmLabel={strings.save}
          onConfirm={(name) => commands.renameAlbumTo(albumBeingRenamed, name)}
          onClose={() => setAlbumBeingRenamed(null)}
        />
      ) : null}
    </View>
  );
}
