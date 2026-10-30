/**
 * A location's items, as Finder shows them: a grid of icons (or of pictures,
 * as Photos shows them) or a list whose columns sort, with the pointer's ways
 * of choosing them. A click selects, Shift extends, ⌘ or Ctrl adds or
 * removes, a double click opens; a rubber band from the background selects
 * what it touches; selected items dragged onto a folder or an album go there.
 * A touch opens what it taps and scrolls as a phone's lists do; a long press
 * (or the secondary button) opens the menu for what it is on.
 *
 * Every item's place comes from the width alone (`lib/items-layout`), so the
 * view draws only the items near what can be seen, however many the folder
 * holds, and one handler on the items' area finds the item under a press by
 * arithmetic: an item carries no handler, menu or responder of its own. One
 * context menu serves the area: it opens for the item pressed (with the
 * selection it is in), or for the place where the press found none.
 */
import {
  ContextMenu,
  type ContextMenuAnchor,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@oxy.so/bloom/context-menu';
import { isCommandKey } from '@oxy.so/bloom/kbd';
import { useTheme } from '@oxy.so/bloom/theme';
import { Text } from '@oxy.so/bloom/typography';
import {
  type ComponentRef,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type AccessibilityActionInfo,
  type GestureResponderEvent,
  Keyboard,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type PointerEvent,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ViewMode } from '@/components/BrowserProvider';
import { ItemCell } from '@/components/ItemCell';
import { ItemRow, type RenameHandlers } from '@/components/ItemRow';
import { ListHeader, type ListColumns } from '@/components/ListHeader';
import type { Item } from '@/lib/items';
import {
  contentHeight,
  type ItemsLayout,
  itemAt,
  itemFrame,
  itemsBetween,
  itemsGeometry,
  itemsTouching,
} from '@/lib/items-layout';
import {
  type Box,
  bandSelect,
  boxBetween,
  clickSelect,
  isSecondClick,
  isSelected,
  type LastPress,
  NO_PRESS,
  NO_SELECTION,
  type Selection,
  selectOnly,
} from '@/lib/selection';
import type { SortColumn, SortOrder } from '@/lib/sorting';

/** A press moved this far is a drag (a mouse) or a scroll (a touch). */
const DRAG_SLOP = 4;
const TOUCH_SLOP = 10;
/** A touch held this long opens the menu. */
const LONG_PRESS_MS = 500;
/** How far past what can be seen the items are drawn, in screens, so a scroll finds them drawn. */
const OVERSCAN_SCREENS = 1;

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

/** The press in progress, from its start. */
interface Gesture {
  isTouch: boolean;
  start: { x: number; y: number };
  /** The item it began on, or null on the background. */
  key: string | null;
  hasMoved: boolean;
  /** A touch held long enough to open the menu: its release is not a tap. */
  isLongPressed: boolean;
  /** A rubber band's selection when it began, and whether it adds to it. */
  before: Selection;
  isAdding: boolean;
}

/** The menu open over the items: where, and for which item (null: for the place). */
interface OpenMenu {
  anchor: ContextMenuAnchor;
  key: string | null;
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
  /** An item's actions for assistive technology; the same list for items alike. */
  itemActions: (item: Item) => readonly AccessibilityActionInfo[];
  itemMenu: (item: Item) => ReactNode;
  backgroundMenu: ReactNode;
  emptyState: ReactNode;
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
  onWidthChange,
  onEndReached,
}: ItemsViewProps) {
  const theme = useTheme();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  // Which stretch of the items is drawn: it moves in steps of half a screen,
  // so scrolling draws again only as it nears what is not drawn yet.
  const [scrollStep, setScrollStep] = useState(0);
  const [band, setBand] = useState<Box | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);

  const geometry = itemsGeometry(mode, layout, width);
  const listColumns = columnsFor(width);
  const screen = viewportHeight > 0 ? viewportHeight : window.height;
  const stepHeight = Math.max(1, Math.floor(screen / 2));
  const drawnTop = scrollStep * stepHeight - screen * OVERSCAN_SCREENS;
  const drawnBottom = scrollStep * stepHeight + screen * (1 + OVERSCAN_SCREENS);
  const drawn = itemsBetween(geometry, items.length, drawnTop, drawnBottom);
  const height = contentHeight(geometry, items.length);
  const rowCount = Math.ceil(items.length / geometry.columns);
  const rename: RenameHandlers = { onText: onRenameText, onDone: onRenameDone };

  // An item's accessibility action calls whatever the browser does now; the
  // items keep one handler, so they need not draw again when it changes.
  const latestAction = useRef(onAction);
  useLayoutEffect(() => {
    latestAction.current = onAction;
  });
  const [handleAccessibilityAction] = useState(
    () => (item: Item, action: string) => latestAction.current(item, action),
  );

  // How the press now in progress came: a mouse selects, drags and bands; a
  // touch taps and scrolls. Read from the W3C pointer event that precedes the
  // responder's (`pointerdown`), so a platform without pointer events is touch.
  const pointerType = useRef<string | null>(null);
  const pointerButton = useRef(0);
  const lastPress = useRef<LastPress>(NO_PRESS);
  const collapseOnRelease = useRef<string | null>(null);
  /** A rubber band adds to the selection when Shift, ⌘ or Ctrl was held as it began. */
  const isBandAdding = useRef(false);
  const gesture = useRef<Gesture | null>(null);
  const dragging = useRef<Drag | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The item the next menu opens for, set by the press that opens it. */
  const menuTarget = useRef<string | null>(null);

  // Where the items' area is in the window, measured as it is laid out (and
  // as a press begins) at the scroll offset then, and moved by how far it has
  // scrolled since.
  const content = useRef<ComponentRef<typeof View> | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const scrollTop = useRef(0);
  const origin = useRef({ x: 0, y: 0, scrolled: 0 });
  const measureContent = () => {
    const at = scrollTop.current;
    content.current?.measureInWindow((x, y) => {
      origin.current = { x, y, scrolled: at };
    });
  };
  const contentPoint = (windowX: number, windowY: number) => ({
    x: windowX - origin.current.x,
    y: windowY - (origin.current.y - (scrollTop.current - origin.current.scrolled)),
  });

  const itemAtPoint = (point: { x: number; y: number }): Item | null => {
    const index = itemAt(geometry, items.length, point);
    return index === null ? null : (items[index] ?? null);
  };
  const draggedItems = (keys: readonly string[]) => items.filter((item) => keys.includes(item.key));
  const dropTargetAt = (
    point: { x: number; y: number },
    keys: readonly string[],
  ): string | null => {
    const target = itemAtPoint(point);
    if (!target || keys.includes(target.key)) return null;
    return canDrop(draggedItems(keys), target) ? target.key : null;
  };

  const cancelLongPress = () => {
    if (longPress.current !== null) clearTimeout(longPress.current);
    longPress.current = null;
  };
  // The timer is the one thing a press leaves running past the view.
  useEffect(
    () => () => {
      if (longPress.current !== null) clearTimeout(longPress.current);
    },
    [],
  );

  const showDrag = (next: Drag | null) => {
    dragging.current = next;
    setDrag(next);
  };

  const handlePointerDown = (event: PointerEvent) => {
    const { button, shiftKey, pointerType: type, clientX, clientY } = event.nativeEvent;
    pointerType.current = type;
    pointerButton.current = button;
    measureContent();
    const item = itemAtPoint(contentPoint(clientX, clientY));
    // The name being edited takes its own presses.
    if (item && item.key === renamingKey) return;
    if (renamingKey) onRenameDone();
    // A press among the items takes the keys from a field (the search), as
    // Finder's does, so the arrows and type-select act on the items again.
    Keyboard.dismiss();
    const isToggling = isCommandKey(event.nativeEvent);
    if (button === 2) {
      // A menu is for the selection, which the item joins if it is not in it;
      // on the background it is the place's, and nothing stays selected. The
      // press goes on to the menu's trigger, which opens it where it pressed.
      menuTarget.current = item?.key ?? null;
      if (!item) onSelectionChange(() => NO_SELECTION);
      else if (!isSelected(selection, item.key)) onSelectionChange(() => selectOnly(item.key));
      return;
    }
    if (button !== 0 || type !== 'mouse') return;
    if (!item) {
      isBandAdding.current = shiftKey || isToggling;
      if (!isBandAdding.current) onSelectionChange(() => NO_SELECTION);
      return;
    }
    // The press's own time, not when it was handled: a first click that was
    // slow to draw still makes a double click with the second.
    const at = event.timeStamp;
    const isSecond = isSecondClick(lastPress.current, item.key, at);
    lastPress.current = isSecond ? NO_PRESS : { key: item.key, at };
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
    const keys = items.map((each) => each.key);
    onSelectionChange((current) =>
      clickSelect(current, keys, item.key, { isExtending: shiftKey, isToggling }),
    );
  };

  const openMenu = (anchor: ContextMenuAnchor | null) => {
    setMenu(anchor ? { anchor, key: menuTarget.current } : null);
  };

  const handleGrant = (event: GestureResponderEvent) => {
    const isTouch = pointerType.current !== 'mouse';
    const point = contentPoint(event.nativeEvent.pageX, event.nativeEvent.pageY);
    const item = itemAtPoint(point);
    gesture.current = {
      isTouch,
      start: point,
      key: item?.key ?? null,
      hasMoved: false,
      isLongPressed: false,
      before: selection,
      isAdding: isBandAdding.current,
    };
    if (!isTouch) return;
    const { pageX, pageY } = event.nativeEvent;
    cancelLongPress();
    longPress.current = setTimeout(() => {
      longPress.current = null;
      const held = gesture.current;
      if (!held || held.hasMoved) return;
      held.isLongPressed = true;
      menuTarget.current = held.key;
      const key = held.key;
      if (key && !isSelected(selection, key)) onSelectionChange(() => selectOnly(key));
      openMenu({ x: pageX, y: pageY });
    }, LONG_PRESS_MS);
  };

  const handleMove = (event: GestureResponderEvent) => {
    const now = gesture.current;
    if (!now) return;
    const point = contentPoint(event.nativeEvent.pageX, event.nativeEvent.pageY);
    const distance = Math.hypot(point.x - now.start.x, point.y - now.start.y);
    if (now.isTouch) {
      if (distance >= TOUCH_SLOP) {
        now.hasMoved = true;
        cancelLongPress();
      }
      return;
    }
    if (!now.hasMoved && distance < DRAG_SLOP) return;
    now.hasMoved = true;
    const key = now.key;
    if (key) {
      const keys = dragging.current?.keys ?? (isSelected(selection, key) ? selection.keys : [key]);
      showDrag({ keys, x: point.x, y: point.y, over: dropTargetAt(point, keys) });
      return;
    }
    const box = boxBetween(now.start, point);
    setBand(box);
    const touched = itemsTouching(geometry, items.length, box).flatMap((index) => {
      const item = items[index];
      return item ? [item.key] : [];
    });
    onSelectionChange(() => bandSelect(now.before, touched, now.isAdding));
  };

  const handleRelease = (event: GestureResponderEvent) => {
    const ended = gesture.current;
    gesture.current = null;
    cancelLongPress();
    setBand(null);
    if (!ended) return;
    if (ended.isTouch) {
      if (ended.hasMoved || ended.isLongPressed) return;
      const key = ended.key;
      const item = key ? items.find((each) => each.key === key) : undefined;
      if (!item) {
        onSelectionChange(() => NO_SELECTION);
        return;
      }
      onSelectionChange(() => selectOnly(item.key));
      onOpen(item);
      return;
    }
    const dragged = dragging.current;
    showDrag(null);
    if (dragged) {
      const over = dropTargetAt(
        contentPoint(event.nativeEvent.pageX, event.nativeEvent.pageY),
        dragged.keys,
      );
      const target = over ? items.find((item) => item.key === over) : undefined;
      if (target) onDrop(draggedItems(dragged.keys), target);
    } else if (ended.key && collapseOnRelease.current === ended.key) {
      const key = ended.key;
      onSelectionChange(() => selectOnly(key));
    }
    collapseOnRelease.current = null;
  };

  const handleTerminate = () => {
    gesture.current = null;
    cancelLongPress();
    setBand(null);
    showDrag(null);
    collapseOnRelease.current = null;
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth(next);
    onWidthChange(next);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    scrollTop.current = contentOffset.y;
    setScrollStep(Math.max(0, Math.floor(contentOffset.y / stepHeight)));
    const distanceToEnd = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (onEndReached && distanceToEnd < layoutMeasurement.height) onEndReached();
  };

  // The item the keys moved to is brought into view, as Finder scrolls to it.
  const focusIndex = selection.focus ? items.findIndex((item) => item.key === selection.focus) : -1;
  const focusFrame = focusIndex >= 0 ? itemFrame(geometry, focusIndex) : null;
  const focusTop = focusFrame?.y ?? 0;
  const focusBottom = focusFrame ? focusFrame.y + focusFrame.height : 0;
  useEffect(() => {
    if (focusIndex < 0 || viewportHeight === 0) return;
    const top = scrollTop.current;
    if (focusTop < top) {
      scroller.current?.scrollTo({ y: focusTop, animated: false });
    } else if (focusBottom > top + viewportHeight) {
      scroller.current?.scrollTo({ y: focusBottom - viewportHeight, animated: false });
    }
  }, [focusIndex, focusTop, focusBottom, viewportHeight]);

  const menuItem = menu?.key ? items.find((item) => item.key === menu.key) : undefined;

  const renderItem = (item: Item, index: number) => {
    const frame = itemFrame(geometry, index);
    const isItemSelected = isSelected(selection, item.key);
    const thumbnailUrl = thumbnails.get(item.key) ?? null;
    const isDropTarget = drag?.over === item.key;
    const itemRename = renamingKey === item.key ? rename : null;
    if (mode === 'list') {
      return (
        <ItemRow
          key={item.key}
          item={item}
          top={frame.y}
          height={frame.height}
          isStriped={index % 2 === 1}
          isSelected={isItemSelected}
          isWindowActive={isWindowActive}
          isDropTarget={isDropTarget}
          rename={itemRename}
          columns={listColumns}
          hasOriginColumn={hasOriginColumn}
          origin={hasOriginColumn ? originOf(item) : ''}
          thumbnailUrl={thumbnailUrl}
          accessibilityActions={itemActions(item)}
          onAccessibilityAction={handleAccessibilityAction}
        />
      );
    }
    return (
      <ItemCell
        key={item.key}
        item={item}
        layout={layout}
        left={frame.x}
        top={frame.y}
        width={frame.width}
        height={frame.height}
        layer={rowCount - Math.floor(index / geometry.columns)}
        isSelected={isItemSelected}
        isWindowActive={isWindowActive}
        isDropTarget={isDropTarget}
        rename={itemRename}
        thumbnailUrl={thumbnailUrl}
        accessibilityActions={itemActions(item)}
        onAccessibilityAction={handleAccessibilityAction}
      />
    );
  };

  return (
    <ContextMenu anchor={menu?.anchor ?? null} onAnchorChange={openMenu}>
      <ContextMenuTrigger asChild label={label} style={{ flex: 1, alignSelf: 'stretch' }}>
        <View
          className="flex-1 select-none"
          accessibilityRole="list"
          accessibilityLabel={label}
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
            ref={scroller}
            className="flex-1"
            contentContainerClassName="grow"
            scrollEventThrottle={16}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            onScroll={handleScroll}
          >
            <View
              ref={content}
              testID="items"
              className="grow"
              style={{ minHeight: height }}
              onLayout={measureContent}
              onPointerDown={handlePointerDown}
              onStartShouldSetResponder={() =>
                pointerType.current !== 'mouse' || pointerButton.current === 0
              }
              onResponderGrant={handleGrant}
              onResponderMove={handleMove}
              onResponderRelease={handleRelease}
              onResponderTerminate={handleTerminate}
              onResponderTerminationRequest={() => gesture.current?.isTouch ?? true}
            >
              {items
                .slice(drawn.start, drawn.end)
                .map((item, offset) => renderItem(item, drawn.start + offset))}
              {items.length === 0 ? (
                <View pointerEvents="box-none" className="absolute inset-x-0 top-20 items-center">
                  {emptyState}
                </View>
              ) : null}
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
      <ContextMenuContent>{menuItem ? itemMenu(menuItem) : backgroundMenu}</ContextMenuContent>
    </ContextMenu>
  );
}
