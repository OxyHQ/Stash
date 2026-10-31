/**
 * An item in a grid: Finder's icon over its name, or Photos' picture filling
 * its square. It draws itself where the grid places it and again only when
 * something it shows changes.
 *
 * A name runs to two lines, its last cut short where it is longer (a platform
 * cuts the middle of one line only); selected, it is shown whole, over the
 * row below if it must be, as Finder shows it.
 */
import { Text } from '@oxy.so/bloom/typography';
import { memo } from 'react';
import { type AccessibilityActionEvent, type AccessibilityActionInfo, View } from 'react-native';
import { ItemIcon } from '@/components/ItemIcon';
import type { RenameHandlers } from '@/components/ItemRow';
import { RenameField } from '@/components/RenameField';
import { type Item, itemKind } from '@/lib/items';
import { ICON_CELL, type ItemsLayout } from '@/lib/items-layout';

export interface ItemCellProps {
  item: Item;
  layout: ItemsLayout;
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * Where it is stacked: a row above the rows after it, so a selected name
   * shown whole runs over the row below. Fixed by its place, never by the
   * selection, so selecting redraws only the two items it moved between.
   */
  layer: number;
  isSelected: boolean;
  isWindowActive: boolean;
  isDropTarget: boolean;
  /** The name's field, while the name is being edited. */
  rename: RenameHandlers | null;
  thumbnailUrl: string | null;
  accessibilityActions: readonly AccessibilityActionInfo[];
  onAccessibilityAction: (item: Item, action: string) => void;
}

export const ItemCell = memo(function ItemCell({
  item,
  layout,
  left,
  top,
  width,
  height,
  layer,
  isSelected,
  isWindowActive,
  isDropTarget,
  rename,
  thumbnailUrl,
  accessibilityActions,
  onAccessibilityAction,
}: ItemCellProps) {
  const kind = itemKind(item);
  const accessibility = {
    testID: `item-${item.name}`,
    // One element for assistive technology, its icon and name read as it.
    accessible: true,
    accessibilityRole: 'listitem' as const,
    accessibilityLabel: item.name,
    'aria-selected': isSelected,
    accessibilityActions,
    onAccessibilityAction: (event: AccessibilityActionEvent) =>
      onAccessibilityAction(item, event.nativeEvent.actionName),
  };
  if (layout === 'photos') {
    return (
      <View {...accessibility} className="absolute bg-muted" style={{ left, top, width, height }}>
        <ItemIcon kind={kind} size={width} thumbnailUrl={thumbnailUrl} isCropped />
        {isSelected || isDropTarget ? (
          <View
            pointerEvents="none"
            className={
              isSelected && isWindowActive
                ? 'absolute inset-0 border-[3px] border-primary'
                : 'absolute inset-0 border-[3px] border-text-tertiary'
            }
          />
        ) : null}
      </View>
    );
  }
  // Selected: the accent in the active window, grey in an inactive one, as Finder's.
  const labelClass = isSelected ? (isWindowActive ? 'bg-primary' : 'bg-fill-secondary') : '';
  const textClass = isSelected && isWindowActive ? 'text-primary-foreground' : 'text-foreground';
  return (
    <View
      {...accessibility}
      className="absolute select-none items-center gap-1 pt-1.5"
      style={{ left, top, width, height, zIndex: layer }}
    >
      <View
        className={
          isSelected
            ? 'rounded-lg bg-fill-secondary p-1'
            : isDropTarget
              ? 'rounded-lg bg-primary-subtle p-1'
              : 'rounded-lg p-1'
        }
      >
        <ItemIcon kind={kind} size={ICON_CELL.icon} thumbnailUrl={thumbnailUrl} />
      </View>
      {rename && item.source === 'local' ? (
        <RenameField
          name={item.name}
          isFolder={item.isFolder}
          isCentred
          onText={rename.onText}
          onDone={rename.onDone}
        />
      ) : (
        <View className={`max-w-24 rounded-[5px] px-1.5 py-px ${labelClass}`}>
          <Text
            variant="caption-1-regular"
            numberOfLines={isSelected ? undefined : 2}
            ellipsizeMode="tail"
            selectable={false}
            className={`text-center ${textClass}`}
          >
            {item.name}
          </Text>
        </View>
      )}
    </View>
  );
});
