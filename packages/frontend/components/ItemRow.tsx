/**
 * An item in the list: its icon and name, then its date, size and kind (and,
 * in the Trash, where it was). It draws itself where the list places it and
 * again only when something it shows changes: a list's selection moving
 * redraws the two rows it moved between, not every row.
 */
import { Text } from '@oxy.so/bloom/typography';
import { memo } from 'react';
import { type AccessibilityActionInfo, View } from 'react-native';
import { ItemIcon } from '@/components/ItemIcon';
import { COLUMN_WIDTHS, type ListColumns } from '@/components/ListHeader';
import { RenameField } from '@/components/RenameField';
import { useLocale } from '@/hooks/use-locale';
import { formatDate, formatSize } from '@/lib/format';
import { type Item, itemDate, itemKind } from '@/lib/items';

/** What the field a name is being edited in reports. */
export interface RenameHandlers {
  onText: (text: string) => void;
  onDone: () => void;
}

export interface ItemRowProps {
  item: Item;
  top: number;
  height: number;
  isStriped: boolean;
  isSelected: boolean;
  isWindowActive: boolean;
  isDropTarget: boolean;
  /** The name's field, while the name is being edited. */
  rename: RenameHandlers | null;
  columns: ListColumns;
  hasOriginColumn: boolean;
  origin: string;
  thumbnailUrl: string | null;
  accessibilityActions: readonly AccessibilityActionInfo[];
  onAccessibilityAction: (item: Item, action: string) => void;
}

export const ItemRow = memo(function ItemRow({
  item,
  top,
  height,
  isStriped,
  isSelected,
  isWindowActive,
  isDropTarget,
  rename,
  columns,
  hasOriginColumn,
  origin,
  thumbnailUrl,
  accessibilityActions,
  onAccessibilityAction,
}: ItemRowProps) {
  const { strings, locale } = useLocale();
  const kind = itemKind(item);
  const date = itemDate(item);
  const isAccented = isSelected && isWindowActive;
  const rowClass = isSelected
    ? isWindowActive
      ? 'bg-primary'
      : 'bg-fill-secondary'
    : isDropTarget
      ? 'bg-primary-subtle'
      : isStriped
        ? 'bg-fill/40'
        : '';
  const textClass = isAccented ? 'text-primary-foreground' : 'text-foreground';
  const secondaryClass = isAccented ? 'text-primary-foreground' : 'text-text-secondary';
  const iconSize = height > 30 ? 28 : 18;
  return (
    <View
      testID={`item-${item.name}`}
      accessible
      accessibilityRole="listitem"
      accessibilityLabel={item.name}
      aria-selected={isSelected}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={(event) => onAccessibilityAction(item, event.nativeEvent.actionName)}
      className={`absolute inset-x-2.5 select-none flex-row items-center rounded-[6px] px-2 ${rowClass}`}
      style={{ top, height }}
    >
      <ItemIcon
        kind={kind}
        size={iconSize}
        thumbnailUrl={thumbnailUrl}
        isCropped
        testID={`thumbnail-${item.name}`}
      />
      {rename && item.source === 'local' ? (
        <RenameField
          name={item.name}
          isFolder={item.isFolder}
          isCentred={false}
          onText={rename.onText}
          onDone={rename.onDone}
        />
      ) : (
        <Text
          variant="body-2-regular"
          numberOfLines={1}
          ellipsizeMode="middle"
          selectable={false}
          className={`min-w-0 flex-1 ps-2 ${textClass}`}
        >
          {item.name}
        </Text>
      )}
      {hasOriginColumn ? (
        <Text
          variant="body-2-regular"
          numberOfLines={1}
          selectable={false}
          className={`ps-2 ${secondaryClass}`}
          style={{ width: COLUMN_WIDTHS.origin }}
        >
          {origin}
        </Text>
      ) : null}
      {columns.date ? (
        <Text
          variant="body-2-regular"
          numberOfLines={1}
          selectable={false}
          className={`ps-2 ${secondaryClass}`}
          style={{ width: COLUMN_WIDTHS.date }}
        >
          {date === null ? '--' : formatDate(date, Date.now(), locale, strings)}
        </Text>
      ) : null}
      {columns.size ? (
        <Text
          variant="body-2-regular"
          numberOfLines={1}
          selectable={false}
          className={`ps-2 ${secondaryClass}`}
          style={{ width: COLUMN_WIDTHS.size }}
        >
          {item.source === 'album'
            ? strings.photoCount(item.itemCount)
            : item.size === null
              ? '--'
              : formatSize(item.size, strings.units, locale)}
        </Text>
      ) : null}
      {columns.kind ? (
        <Text
          variant="body-2-regular"
          numberOfLines={1}
          selectable={false}
          className={`ps-2 ${secondaryClass}`}
          style={{ width: COLUMN_WIDTHS.kind }}
        >
          {strings.kinds[kind]}
        </Text>
      ) : null}
    </View>
  );
});
