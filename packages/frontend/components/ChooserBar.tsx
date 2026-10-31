/**
 * The file chooser's bar under the items, as a Mac's open and save panels
 * have theirs: New Folder where a folder or a file's place is being chosen,
 * then Cancel and the panel's button (Open, or Save after the name field).
 * The button is enabled only for what the request can take. The name field
 * opens with the name's stem selected, as a rename does.
 */
import { Button } from '@oxy.so/bloom/button';
import { TextFieldInput } from '@oxy.so/bloom/text-field';
import { Text } from '@oxy.so/bloom/typography';
import { useState } from 'react';
import { View } from 'react-native';
import { useLocale } from '@/hooks/use-locale';
import { nameSelection } from '@/lib/names';

export function ChooserBar({
  mode,
  confirmLabel,
  isConfirmEnabled,
  onConfirm,
  onCancel,
  name,
  onName,
  onNewFolder,
}: {
  mode: 'open' | 'save';
  confirmLabel: string;
  isConfirmEnabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** The save panel's name. */
  name: string;
  onName: (name: string) => void;
  /** Makes a folder where the panel is, to name in place; null where none can be made. */
  onNewFolder: (() => void) | null;
}) {
  const { strings } = useLocale();
  // The stem is selected as the field opens; once the selection moves, it is the person's.
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(() =>
    nameSelection(name, false),
  );
  return (
    <View className="gap-2.5 border-t border-border px-3 py-2.5" testID="chooser-bar">
      {mode === 'save' ? (
        <View className="flex-row items-center gap-2">
          <Text variant="body-2-regular" className="text-text-secondary">
            {strings.chooser.saveAs}
          </Text>
          <View className="flex-1">
            <TextFieldInput
              label={strings.chooser.name}
              value={name}
              onValueChange={onName}
              autoFocus
              selection={selection}
              onSelectionChange={() => setSelection(undefined)}
              autoCorrect={false}
              autoCapitalize="none"
              onSubmitEditing={() => {
                if (isConfirmEnabled) onConfirm();
              }}
              testID="chooser-name"
            />
          </View>
        </View>
      ) : null}
      <View className="flex-row items-center gap-2">
        {onNewFolder ? (
          <Button
            appearance="outline"
            tone="neutral"
            onPress={onNewFolder}
            testID="chooser-new-folder"
          >
            {strings.menus.newFolder}
          </Button>
        ) : null}
        <View className="flex-1" />
        <Button appearance="outline" tone="neutral" onPress={onCancel} testID="chooser-cancel">
          {strings.cancel}
        </Button>
        <Button disabled={!isConfirmEnabled} onPress={onConfirm} testID="chooser-confirm">
          {confirmLabel}
        </Button>
      </View>
    </View>
  );
}
