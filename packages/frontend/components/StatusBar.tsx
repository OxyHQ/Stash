/** The line under the items: how many there are, or how many of them are selected. */
import { useAppShellPanel } from '@oxy.so/bloom/app-shell';
import { Text } from '@oxy.so/bloom/typography';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function StatusBar({ text }: { text: string }) {
  // A pane drawn edge to edge (a phone's) ends at the screen's bottom, over its home indicator.
  const panel = useAppShellPanel();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="min-h-6.5 items-center justify-center border-t border-border"
      style={{ paddingBottom: panel.framed ? 0 : insets.bottom }}
    >
      <Text
        variant="caption-1-regular"
        className="text-text-secondary"
        testID="status"
        accessibilityLiveRegion="polite"
      >
        {text}
      </Text>
    </View>
  );
}
