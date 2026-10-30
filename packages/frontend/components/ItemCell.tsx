/** An item in a grid: Finder's icon over its name, or Photos' picture filling its square. */
import { Text } from '@oxy.so/bloom/typography';
import { View } from 'react-native';
import { ItemIcon } from '@/components/ItemIcon';
import { ICON_CELL, type ItemsLayout } from '@/components/ItemsView';
import { RenameField } from '@/components/RenameField';
import { type Item, itemKind } from '@/lib/items';

export function ItemCell({
  item,
  layout,
  photoSize,
  isSelected,
  isWindowActive,
  isDropTarget,
  isRenaming,
  onRenameText,
  onRenameDone,
  thumbnailUrl,
}: {
  item: Item;
  layout: ItemsLayout;
  photoSize: number;
  isSelected: boolean;
  isWindowActive: boolean;
  isDropTarget: boolean;
  isRenaming: boolean;
  onRenameText: (text: string) => void;
  onRenameDone: () => void;
  thumbnailUrl: string | null;
}) {
  const kind = itemKind(item);
  if (layout === 'photos') {
    return (
      <View style={{ width: photoSize, height: photoSize }} className="bg-muted">
        <ItemIcon kind={kind} size={photoSize} thumbnailUrl={thumbnailUrl} isCropped />
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
      className="select-none items-center gap-1 pt-1.5"
      style={{ width: ICON_CELL.width, height: ICON_CELL.height }}
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
      {isRenaming && item.source === 'local' ? (
        <RenameField
          name={item.name}
          isFolder={item.isFolder}
          isCentred
          onText={onRenameText}
          onDone={onRenameDone}
        />
      ) : (
        <View className={`max-w-24 rounded-[5px] px-1.5 py-px ${labelClass}`}>
          <Text
            variant="caption-1-regular"
            numberOfLines={2}
            selectable={false}
            className={`text-center ${textClass}`}
          >
            {item.name}
          </Text>
        </View>
      )}
    </View>
  );
}
