/**
 * A location's items, as Finder shows them: a grid of icons (or of pictures,
 * as Photos shows them) or a list whose columns sort, with the pointer's ways
 * of choosing them. A click selects, Shift extends, ⌘ or Ctrl adds or
 * removes, a double click opens; a rubber band from the background selects
 * what it touches; selected items dragged onto a folder or an album go there.
 * A touch opens what it taps and scrolls as a phone's lists do; a long press
 * (or the secondary button) opens the item's menu.
 */
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@oxy.so/bloom/context-menu';
import { isCommandKey } from '@oxy.so/bloom/kbd';
import { useTheme } from '@oxy.so/bloom/theme';
import { Text } from '@oxy.so/bloom/typography';
import { type ComponentRef, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  PanResponder,
  type PanResponderInstance,
  type PointerEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import type { ViewMode } from '@/components/BrowserProvider';
import { ItemCell } from '@/components/ItemCell';
import { ItemRow } from '@/components/ItemRow';
import { ListHeader, type ListColumns } from '@/components/ListHeader';
import type { Item } from '@/lib/items';
import {
  type Box,
  bandSelect,
  boxBetween,
  clickSelect,
  contains,
  isSelected,
  NO_SELECTION,
  type Selection,
  selectOnly,
} from '@/lib/selection';
import type { SortColumn, SortOrder } from '@/lib/sorting';

/** Two presses this close on one item are a double click. */
const DOUBLE_CLICK_MS = 500;
/** A press moved this far is a drag. */
const DRAG_SLOP = 4;

/** Finder's icon grid: its cell, and the padding around the grid. */
export const ICON_CELL = { width: 104, height: 112, icon: 64 };
const GRID_PADDING = 12;
/** Photos' grid: square pictures at least this wide, this far apart. */
const PHOTO_MIN_SIZE = 110;
const PHOTO_GAP = 2;
/** The list's rows: a desktop's compact rows, a phone's touch-sized ones below this width. */
const COMPACT_ROW_HEIGHT = 28;
const TOUCH_ROW_HEIGHT = 44;
const TOUCH_LIST_BELOW = 600;

export type ItemsLayout = 'files' | 'photos';

/** How many columns a grid has at a width, for the arrows' steps down it. */
export function gridColumns(width: number, layout: ItemsLayout): number {
  const usable = width - GRID_PADDING * 2;
  if (layout === 'photos') return Math.max(1, Math.floor((usable + PHOTO_GAP) / PHOTO_MIN_SIZE));
  return Math.max(1, Math.floor(usable / ICON_CELL.width));
}

/** The list's columns that fit a width: the name always, then date, size and kind as room allows. */
function columnsFor(width: number): ListColumns {
  return { date: width >= 420, size: width >= 520, kind: width >= 700 };
}

interface Drag {
  keys: readonly string[];
  x: number;
  y: number;
  over: string | null;
}

export interface ItemsViewProps {
  items: readonly Item[];
  mode: ViewMode;
  layout: ItemsLayout;
  label: string;
  selection: Selection;
  onSelectionChange: (change: (selection: Selection) => Selection) => void;
  isWindowActive: boolean;
  thumbnails: ReadonlyMap<string, string>;
  renamingKey: string | null;
  onRenameText: (text: string) => void;
  /** Ends a rename in progress, keeping the name typed: Return, leaving the field, a press elsewhere. */
  onRenameDone: () => void;
  order: SortOrder;
  onSort: (column: SortColumn) => void;
  dateColumn: 'date' | 'deleted' | 'taken';
  hasOriginColumn: boolean;
  originOf: (item: Item) => string;
  onOpen: (item: Item) => void;
  /** Whether dragged items may be dropped on an item (a folder, an album). */
  canDrop: (dragged: readonly Item[], target: Item) => boolean;
  onDrop: (dragged: readonly Item[], target: Item) => void;
  onAction: (item: Item, action: string) => void;
  itemActions: (item: Item) => { name: string; label: string }[];
  itemMenu: (item: Item) => ReactNode;
  backgroundMenu: ReactNode;
  emptyState: ReactNode;
  footer: ReactNode;
  onWidthChange: (width: number) => void;
  onEndReached?: () => void;
}

export function ItemsView({
  items,
  mode,
  layout,
  label,
  selection,
  onSelectionChange,
  isWindowActive,
  thumbnails,
  renamingKey,
  onRenameText,
  onRenameDone,
  order,
  onSort,
  dateColumn,
  hasOriginColumn,
  originOf,
  onOpen,
  canDrop,
  onDrop,
  onAction,
  itemActions,
  itemMenu,
  backgroundMenu,
  emptyState,
  footer,
  onWidthChange,
  onEndReached,
}: ItemsViewProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [band, setBand] = useState<Box | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const keys = items.map((item) => item.key);
  const columns = gridColumns(width, layout);
  const photoSize =
    layout === 'photos'
      ? Math.floor((width - GRID_PADDING * 2 - PHOTO_GAP * (columns - 1)) / columns)
      : 0;
  const rowHeight = width < TOUCH_LIST_BELOW ? TOUCH_ROW_HEIGHT : COMPACT_ROW_HEIGHT;
  const listColumns = columnsFor(width);

  // Where each item is, in the content's own coordinates, from the layout's arithmetic.
  const frames = new Map<string, Box>();
  items.forEach((item, index) => {
    if (mode === 'list') {
      frames.set(item.key, {
        x: 0,
        y: index * rowHeight,
        width: Math.max(width, 1),
        height: rowHeight,
      });
    } else if (layout === 'photos') {
      frames.set(item.key, {
        x: GRID_PADDING + (index % columns) * (photoSize + PHOTO_GAP),
        y: GRID_PADDING + Math.floor(index / columns) * (photoSize + PHOTO_GAP),
        width: photoSize,
        height: photoSize,
      });
    } else {
      frames.set(item.key, {
        x: GRID_PADDING + (index % columns) * ICON_CELL.width,
        y: GRID_PADDING + Math.floor(index / columns) * ICON_CELL.height,
        width: ICON_CELL.width,
        height: ICON_CELL.height,
      });
    }
  });

  // What the responders read between renders: they are made once, and must
  // see the latest items, frames and selection.
  const live = useRef({ items, keys, frames, selection, canDrop, onDrop, onSelectionChange });
  useLayoutEffect(() => {
    live.current = { items, keys, frames, selection, canDrop, onDrop, onSelectionChange };
  });

  // How the press now in progress came: a mouse selects, drags and bands; a
  // touch taps and scrolls. Read from the W3C pointer event that precedes the
  // responder's (`pointerdown`), so a platform without pointer events is touch.
  const pointerType = useRef<string | null>(null);
  /** The item the press now in progress began on: the one a drag carries. */
  const pressedKey = useRef<string | null>(null);
  /** A secondary press on an item, which reaches the background after the item's menu takes it. */
  const isItemMenuPress = useRef(false);
  const lastDown = useRef({ key: '', at: 0 });
  const collapseOnRelease = useRef<string | null>(null);
  const isBandAdding = useRef(false);

  // Where the content is in the window, measured as it is laid out at the
  // scroll offset then and moved by how far it has scrolled since.
  const content = useRef<ComponentRef<typeof View> | null>(null);
  const scrolled = useRef(0);
  const origin = useRef({ x: 0, y: 0, scrolled: 0 });
  const measureContent = () => {
    const at = scrolled.current;
    content.current?.measureInWindow((x, y) => {
      origin.current = { x, y, scrolled: at };
    });
  };
  const pointAt = (event: GestureResponderEvent) => ({
    x: event.nativeEvent.pageX - origin.current.x,
    y: event.nativeEvent.pageY - (origin.current.y - (scrolled.current - origin.current.scrolled)),
  });

  const draggedItems = (dragKeys: readonly string[]) =>
    live.current.items.filter((item) => dragKeys.includes(item.key));
  const targetAt = (
    point: { x: number; y: number },
    dragKeys: readonly string[],
  ): string | null => {
    const dragged = draggedItems(dragKeys);
    for (const item of live.current.items) {
      const frame = live.current.frames.get(item.key);
      if (!frame || !contains(frame, point)) continue;
      return live.current.canDrop(dragged, item) ? item.key : null;
    }
    return null;
  };

  const dragging = useRef<Drag | null>(null);
  const showDrag = (next: Drag | null) => {
    dragging.current = next;
    setDrag(next);
  };

  const bandStart = useRef({ x: 0, y: 0, before: NO_SELECTION, isAdding: false });
  const [backgroundResponder] = useState<PanResponderInstance>(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => pointerType.current === 'mouse',
      onPanResponderGrant: (event) => {
        measureContent();
        const point = pointAt(event);
        bandStart.current = {
          ...point,
          before: live.current.selection,
          isAdding: isBandAdding.current,
        };
      },
      onPanResponderMove: (event) => {
        const point = pointAt(event);
        const from = bandStart.current;
        if (Math.abs(point.x - from.x) < DRAG_SLOP && Math.abs(point.y - from.y) < DRAG_SLOP) {
          return;
        }
        const box = boxBetween(from, point);
        setBand(box);
        const { keys: order, frames: laidOut } = live.current;
        live.current.onSelectionChange(() =>
          bandSelect(from.before, order, laidOut, box, from.isAdding),
        );
      },
      onPanResponderRelease: () => setBand(null),
      onPanResponderTerminate: () => setBand(null),
      onPanResponderTerminationRequest: () => false,
    }),
  );

  // One responder for every item: the press's `pointerdown` says which item it is on.
  const [itemResponder] = useState<PanResponderInstance>(() =>
    PanResponder.create({
      // A mouse's press on an item is the item's (a drag), in the capture
      // phase, before the item's own pressable; a touch's is left to the
      // pressable and the scroll view.
      onStartShouldSetPanResponderCapture: () =>
        pointerType.current === 'mouse' && pressedKey.current !== null,
      onPanResponderGrant: () => measureContent(),
      onPanResponderMove: (event, gesture) => {
        const key = pressedKey.current;
        if (!key) return;
        if (!dragging.current && Math.hypot(gesture.dx, gesture.dy) < DRAG_SLOP) return;
        const current = live.current.selection;
        const dragKeys =
          dragging.current?.keys ?? (isSelected(current, key) ? current.keys : [key]);
        const point = pointAt(event);
        showDrag({ keys: dragKeys, x: point.x, y: point.y, over: targetAt(point, dragKeys) });
      },
      onPanResponderRelease: (event) => {
        const key = pressedKey.current;
        const now = dragging.current;
        showDrag(null);
        const over = now ? targetAt(pointAt(event), now.keys) : null;
        const target = over ? live.current.items.find((item) => item.key === over) : undefined;
        if (now && target) live.current.onDrop(draggedItems(now.keys), target);
        if (!now && key && collapseOnRelease.current === key) {
          live.current.onSelectionChange(() => selectOnly(key));
        }
        collapseOnRelease.current = null;
        pressedKey.current = null;
      },
      onPanResponderTerminate: () => {
        showDrag(null);
        pressedKey.current = null;
      },
      onPanResponderTerminationRequest: () => false,
    }),
  );

  const handleItemPointerDown = (item: Item, event: PointerEvent) => {
    const { button, shiftKey, pointerType: type } = event.nativeEvent;
    pointerType.current = type;
    pressedKey.current = item.key;
    if (renamingKey && renamingKey !== item.key) onRenameDone();
    if (button === 2) {
      // A menu is for the selection, which the item joins if it is not in it.
      // The press goes on to the item's menu trigger, which opens there.
      isItemMenuPress.current = true;
      if (!isSelected(selection, item.key)) onSelectionChange(() => selectOnly(item.key));
      return;
    }
    // The item's press is its own: the background's deselecting is not for it.
    event.stopPropagation();
    if (button !== 0 || type !== 'mouse') return;
    const isToggling = isCommandKey(event.nativeEvent);
    const now = Date.now();
    const isSecond =
      lastDown.current.key === item.key && now - lastDown.current.at < DOUBLE_CLICK_MS;
    lastDown.current = { key: item.key, at: isSecond ? 0 : now };
    if (isSecond && !shiftKey && !isToggling) {
      onOpen(item);
      return;
    }
    // A plain click on an item selected among others keeps them while it may
    // become a drag; released where it was, it selects that item alone.
    collapseOnRelease.current =
      !shiftKey && !isToggling && isSelected(selection, item.key) && selection.keys.length > 1
        ? item.key
        : null;
    onSelectionChange((current) =>
      clickSelect(current, keys, item.key, { isExtending: shiftKey, isToggling }),
    );
  };

  const handleItemTap = (item: Item) => {
    // A mouse's click was taken as it pressed; a touch opens what it taps.
    if (pointerType.current === 'mouse') return;
    onSelectionChange(() => selectOnly(item.key));
    onOpen(item);
  };

  const handleItemLongPress = (item: Item) => {
    if (!isSelected(selection, item.key)) onSelectionChange(() => selectOnly(item.key));
  };

  const handleBackgroundPointerDown = (event: PointerEvent) => {
    const { button, shiftKey, pointerType: type } = event.nativeEvent;
    pointerType.current = type;
    if (isItemMenuPress.current) {
      isItemMenuPress.current = false;
      return;
    }
    pressedKey.current = null;
    if (renamingKey) onRenameDone();
    const isAdding = shiftKey || isCommandKey(event.nativeEvent);
    isBandAdding.current = isAdding;
    if ((button === 0 && !isAdding) || button === 2) onSelectionChange(() => NO_SELECTION);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    onWidthChange(next);
  };

  const renderItem = (item: Item, index: number) => {
    const isItemSelected = isSelected(selection, item.key);
    const accessibilityActions = itemActions(item);
    const thumbnailUrl = thumbnails.get(item.key) ?? null;
    const isDropTarget = drag?.over === item.key;
    const body =
      mode === 'list' ? (
        <ItemRow
          item={item}
          height={rowHeight}
          isStriped={index % 2 === 1}
          isSelected={isItemSelected}
          isWindowActive={isWindowActive}
          isDropTarget={isDropTarget}
          isRenaming={renamingKey === item.key}
          onRenameText={onRenameText}
          onRenameDone={onRenameDone}
          columns={listColumns}
          hasOriginColumn={hasOriginColumn}
          origin={originOf(item)}
          thumbnailUrl={thumbnailUrl}
        />
      ) : (
        <ItemCell
          item={item}
          layout={layout}
          photoSize={photoSize}
          isSelected={isItemSelected}
          isWindowActive={isWindowActive}
          isDropTarget={isDropTarget}
          isRenaming={renamingKey === item.key}
          onRenameText={onRenameText}
          onRenameDone={onRenameDone}
          thumbnailUrl={thumbnailUrl}
        />
      );
    return (
      <ContextMenu key={item.key}>
        <ContextMenuTrigger
          asChild
          label={item.name}
          style={mode === 'list' ? { alignSelf: 'stretch' } : undefined}
        >
          <Pressable
            testID={`item-${item.name}`}
            accessibilityRole="listitem"
            accessibilityLabel={item.name}
            aria-selected={isItemSelected}
            accessibilityActions={accessibilityActions}
            onAccessibilityAction={(event) => onAction(item, event.nativeEvent.actionName)}
            onPointerDown={(event: PointerEvent) => handleItemPointerDown(item, event)}
            onPress={() => handleItemTap(item)}
            onLongPress={() => handleItemLongPress(item)}
          >
            {/* The mouse's drag is taken here, inside the pressable, which keeps a touch's tap. */}
            <View {...itemResponder.panHandlers}>{body}</View>
          </Pressable>
        </ContextMenuTrigger>
        <ContextMenuContent>{itemMenu(item)}</ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild label={label} style={{ flex: 1, alignSelf: 'stretch' }}>
        <View
          className="flex-1 select-none"
          accessibilityRole="list"
          accessibilityLabel={label}
          onPointerDown={handleBackgroundPointerDown}
          onLayout={handleLayout}
        >
          {mode === 'list' ? (
            <ListHeader
              order={order}
              onSort={onSort}
              columns={listColumns}
              dateColumn={dateColumn}
              hasOriginColumn={hasOriginColumn}
            />
          ) : null}
          <ScrollView
            className="flex-1"
            contentContainerClassName="grow"
            scrollEventThrottle={16}
            onScroll={(event) => {
              scrolled.current = event.nativeEvent.contentOffset.y;
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const distanceToEnd =
                contentSize.height - (layoutMeasurement.height + contentOffset.y);
              if (onEndReached && distanceToEnd < layoutMeasurement.height) onEndReached();
            }}
          >
            <View
              ref={content}
              onLayout={measureContent}
              testID="items"
              className="min-h-50 grow"
              {...backgroundResponder.panHandlers}
            >
              {mode === 'list' ? (
                items.map(renderItem)
              ) : (
                <View
                  className="flex-row flex-wrap"
                  style={{ padding: GRID_PADDING, gap: layout === 'photos' ? PHOTO_GAP : 0 }}
                >
                  {items.map(renderItem)}
                </View>
              )}
              {items.length === 0 ? (
                <View pointerEvents="box-none" className="absolute inset-x-0 top-20 items-center">
                  {emptyState}
                </View>
              ) : null}
              {footer}
              {band ? (
                <View
                  pointerEvents="none"
                  className="absolute border border-primary bg-primary/10"
                  style={{ left: band.x, top: band.y, width: band.width, height: band.height }}
                />
              ) : null}
              {drag ? (
                <View
                  pointerEvents="none"
                  className="absolute h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2"
                  style={{ left: drag.x + 8, top: drag.y + 8 }}
                >
                  <Text
                    variant="caption-1-semibold"
                    style={{ color: theme.colors.primaryForeground }}
                  >
                    {String(drag.keys.length)}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </ContextMenuTrigger>
      <ContextMenuContent>{backgroundMenu}</ContextMenuContent>
    </ContextMenu>
  );
}
