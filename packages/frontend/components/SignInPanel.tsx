/** What a place in Oxy shows to someone signed out: what it is, and the way in. */
import { EmptyState } from '@oxy.so/bloom/empty-state';
import { RiCloudLine } from '@oxy.so/bloom/icons';
import { OxySignInButton } from '@oxy.so/services/ui/client';
import { View } from 'react-native';
import { useLocale } from '@/hooks/use-locale';

export function SignInPanel() {
  const { strings } = useLocale();
  return (
    <View className="items-center gap-4 px-6" testID="sign-in">
      <EmptyState
        icon={RiCloudLine}
        title={strings.signIn.cloudTitle}
        description={strings.signIn.cloudBody}
      />
      <OxySignInButton />
    </View>
  );
}
