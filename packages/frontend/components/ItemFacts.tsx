/**
 * An item's facts, as Finder's preview and Get Info list them: its kind, its
 * size, a photo's dimensions, when it was modified (or deleted) and where a
 * trashed item was.
 */
import { Text } from '@oxy.so/bloom/typography';
import { View } from 'react-native';
import { useLocale } from '@/hooks/use-locale';
import { formatDate, formatSize } from '@/lib/format';
import { type Item, itemDate, itemKind } from '@/lib/items';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text variant="caption-1-regular" className="w-28 text-end text-text-secondary">
        {label}
      </Text>
      <Text variant="caption-1-regular" className="flex-1 text-foreground">
        {value}
      </Text>
    </View>
  );
}

export function ItemFacts({ item, origin }: { item: Item; origin: string | null }) {
  const { strings, locale } = useLocale();
  const kind = itemKind(item);
  const date = itemDate(item);
  const isTrashed = item.source === 'local-trash' || item.source === 'cloud-trash';
  return (
    <View className="w-full gap-1">
      <Fact label={strings.preview.kind} value={strings.kinds[kind]} />
      {item.size === null ? null : (
        <Fact label={strings.preview.size} value={formatSize(item.size, strings.units, locale)} />
      )}
      {item.source === 'album-photo' ? (
        <Fact label={strings.preview.dimensions} value={`${item.width} × ${item.height}`} />
      ) : null}
      {date === null ? null : (
        <Fact
          label={isTrashed ? strings.preview.deleted : strings.preview.modified}
          value={formatDate(date, Date.now(), locale, strings)}
        />
      )}
      {origin ? <Fact label={strings.preview.where} value={origin} /> : null}
    </View>
  );
}
