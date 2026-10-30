import '../global.css';

import { Slot } from 'expo-router';
import { OxyProvider } from '@oxy.so/services/ui/client';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OXY_API_URL, OXY_CLIENT_ID } from '@/lib/config';
import { queryClient } from '@/lib/query-client';

/**
 * Stash's providers. The platform's adapter (OxyOS's windows, menu bar and the
 * person's places and Trash) is registered around this by the runtime that
 * runs Stash; Stash's own BloomProvider keeps it.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BloomProvider>
          <OxyProvider baseURL={OXY_API_URL} clientId={OXY_CLIENT_ID} queryClient={queryClient}>
            <Slot />
          </OxyProvider>
        </BloomProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
