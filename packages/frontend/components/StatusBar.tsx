/** The line under the items: how many there are, or how many of them are selected. */
import { Text } from '@oxy.so/bloom/typography';
import { View } from 'react-native';

export function StatusBar({ text }: { text: string }) {
  return (
    <View className="h-6.5 items-center justify-center border-t border-border">
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
