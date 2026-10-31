/**
 * The bars under the items, Finder's: the path bar (each folder down to this
 * one a way back up, for a place on this device) and the status bar (how many
 * items there are, or how many of them are selected). The pane's `Screen`
 * places them at its bottom and keeps the items clear of them.
 */
import { useAppShellPanel } from '@oxy.so/bloom/app-shell';
import { Breadcrumb, BreadcrumbItem } from '@oxy.so/bloom/breadcrumb';
import { Text } from '@oxy.so/bloom/typography';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '@/hooks/use-locale';

export function StatusBar({
  text,
  path,
  onPath,
}: {
  text: string;
  /** The folders down to this one, for a place on this device; empty where none is shown. */
  path: readonly { name: string; uri: string }[];
  onPath: (uri: string) => void;
}) {
  const { strings } = useLocale();
  // A pane drawn edge to edge (a phone's) ends at the screen's bottom, over its home indicator.
  const panel = useAppShellPanel();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="border-t border-border"
      style={{ paddingBottom: panel.framed ? 0 : insets.bottom }}
    >
      {path.length > 0 ? (
        <View className="min-h-7 justify-center border-b border-border px-3">
          <Breadcrumb size="sm" overflow="collapse" accessibilityLabel={strings.path} testID="path">
            {path.map((part, index) => (
              <BreadcrumbItem
                key={part.uri}
                current={index === path.length - 1}
                onPress={index === path.length - 1 ? undefined : () => onPath(part.uri)}
              >
                {part.name}
              </BreadcrumbItem>
            ))}
          </Breadcrumb>
        </View>
      ) : null}
      <View className="min-h-6.5 items-center justify-center">
        <Text
          variant="caption-1-regular"
          className="text-text-secondary"
          testID="status"
          accessibilityLiveRegion="polite"
        >
          {text}
        </Text>
      </View>
    </View>
  );
}
