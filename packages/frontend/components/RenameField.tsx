/**
 * A name being edited in place, as Finder edits one: its stem selected first,
 * Return or a press elsewhere keeps it, Escape (the window's key, taken by
 * the view) cancels it.
 */
import { useTheme } from '@oxy.so/bloom/theme';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { useLocale } from '@/hooks/use-locale';
import { nameSelection } from '@/lib/names';

export function RenameField({
  name,
  isFolder,
  isCentred,
  onText,
  onDone,
}: {
  name: string;
  isFolder: boolean;
  isCentred: boolean;
  onText: (text: string) => void;
  /** Return was pressed or the field lost focus: the name typed is kept. */
  onDone: () => void;
}) {
  const theme = useTheme();
  const { strings } = useLocale();
  const [text, setText] = useState(name);
  // The stem is selected as the field opens; once the selection moves, it is the person's.
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(() =>
    nameSelection(name, isFolder),
  );
  return (
    <TextInput
      testID="rename"
      autoFocus
      value={text}
      onChangeText={(next) => {
        setText(next);
        onText(next);
      }}
      selection={selection}
      onSelectionChange={() => setSelection(undefined)}
      onSubmitEditing={onDone}
      onBlur={onDone}
      accessibilityLabel={strings.rename}
      autoCorrect={false}
      autoCapitalize="none"
      selectionColor={theme.colors.primary}
      className={
        isCentred
          ? 'min-w-24 max-w-[100px] rounded border-2 outline-none border-primary bg-background px-1 py-px text-center text-xs text-foreground'
          : 'ms-2 min-w-30 flex-1 rounded border-2 outline-none border-primary bg-background px-1 py-px text-[13px] text-foreground'
      }
    />
  );
}
