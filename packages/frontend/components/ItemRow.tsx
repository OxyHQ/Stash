/** An item in the list: its icon and name, then its date, size and kind (and, in the Trash, where it was). */
import { Text } from '@oxy.so/bloom/typography';
import { View } from 'react-native';
import { ItemIcon } from '@/components/ItemIcon';
import { COLUMN_WIDTHS, type ListColumns } from '@/components/ListHeader';
import { RenameField } from '@/components/RenameField';
import { useLocale } from '@/hooks/use-locale';
import { formatDate, formatSize } from '@/lib/format';
import { type Item, itemDate, itemKind } from '@/lib/items';

export function ItemRow({
  item,
  height,
  isStriped,
  isSelected,
  isWindowActive,
  isDropTarget,
  isRenaming,
  onRenameText,
  onRenameDone,
  columns,
  hasOriginColumn,
  origin,
  thumbnailUrl,
}: {
  item: Item;
  height: number;
  isStriped: boolean;
  isSelected: boolean;
  isWindowActive: boolean;
  isDropTarget: boolean;
  isRenaming: boolean;
  onRenameText: (text: string) => void;
  onRenameDone: () => void;
  columns: ListColumns;
  hasOriginColumn: boolean;
  origin: string;
  thumbnailUrl: string | null;
}) {
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
      className={`mx-1.5 select-none flex-row items-center rounded-md px-2 ${rowClass}`}
      style={{ height }}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <ItemIcon kind={kind} size={iconSize} thumbnailUrl={thumbnailUrl} isCropped />
        {isRenaming && item.source === 'local' ? (
          <RenameField
            name={item.name}
            isFolder={item.isFolder}
            isCentred={false}
            onText={onRenameText}
            onDone={onRenameDone}
          />
        ) : (
          <Text
            variant="body-2-regular"
            numberOfLines={1}
            selectable={false}
            className={`flex-1 ${textClass}`}
          >
            {item.name}
          </Text>
        )}
      </View>
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
}
