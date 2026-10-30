/**
 * The pane's toolbar, Finder's: back and forward, the path (each folder a way
 * back up) or the place's name, the view and the search in the place. It is
 * the window's chrome where the platform has windows: a press on it that no
 * control takes moves the window.
 */
import { AppShellMenuButton, useAppShell } from '@oxy.so/bloom/app-shell';
import { Breadcrumb, BreadcrumbItem } from '@oxy.so/bloom/breadcrumb';
import { Button } from '@oxy.so/bloom/button';
import { ButtonGroup, ButtonGroupItem } from '@oxy.so/bloom/button-group';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiLayoutGridLine,
  RiListView,
  RiUploadCloud2Line,
} from '@oxy.so/bloom/icons';
import { Search } from '@oxy.so/bloom/search';
import { SegmentedControl, SegmentedControlItem } from '@oxy.so/bloom/segmented-control';
import { useTheme } from '@oxy.so/bloom/theme';
import { Text } from '@oxy.so/bloom/typography';
import { useWindowControlsRoom, WindowDragRegion } from '@oxy.so/bloom/window';
import type { ComponentType } from 'react';
import { View } from 'react-native';
import type { ViewMode } from '@/components/BrowserProvider';
import { useLocale } from '@/hooks/use-locale';

/** Where the pane starts in the window, which the controls' room already counts. */
const PANE_START = 7;
/** Below this width the search takes a row of its own. */
const COMPACT_BELOW = 560;

function Glyph({
  Icon,
}: {
  Icon: ComponentType<{ width?: number; height?: number; fill?: string }>;
}) {
  const theme = useTheme();
  return <Icon width={16} height={16} fill={theme.colors.text} />;
}

export function Toolbar({
  title,
  path,
  onPath,
  viewMode,
  onViewMode,
  search,
  onSearch,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onUpload,
  width,
}: {
  title: string;
  /** The folders down to this one, for a place on this device; empty elsewhere. */
  path: readonly { name: string; uri: string }[];
  onPath: (uri: string) => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  search: string;
  onSearch: (text: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  /** Uploading what the person picks, where that is how files reach Oxy Files here. */
  onUpload: (() => void) | null;
  width: number;
}) {
  const { strings } = useLocale();
  // With the sidebar hidden the toolbar holds the window's corner, and keeps the controls' room.
  const room = useWindowControlsRoom();
  const { navigationDock } = useAppShell();
  const isCompact = width > 0 && width < COMPACT_BELOW;
  const searchField = (
    <Search
      size="sm"
      value={search}
      onChangeText={onSearch}
      onClearText={() => onSearch('')}
      placeholder={strings.searchIn(title)}
      accessibilityLabel={strings.search}
      testID="search"
    />
  );
  return (
    <View>
      <WindowDragRegion
        accessibilityRole="toolbar"
        className="h-13 flex-row items-center gap-2.5 pe-2.5"
        style={{
          paddingInlineStart: navigationDock.hidden ? Math.max(8, room.leading - PANE_START) : 8,
        }}
      >
        <AppShellMenuButton />
        <ButtonGroup size="sm" accessibilityLabel={strings.appName}>
          <ButtonGroupItem
            iconOnly
            leadingIcon={RiArrowLeftSLine}
            accessibilityLabel={strings.back}
            disabled={!canGoBack}
            onPress={onBack}
            testID="back"
          />
          <ButtonGroupItem
            iconOnly
            leadingIcon={RiArrowRightSLine}
            accessibilityLabel={strings.forward}
            disabled={!canGoForward}
            onPress={onForward}
            testID="forward"
          />
        </ButtonGroup>
        <View className="min-w-18 flex-1">
          {path.length > 1 ? (
            <Breadcrumb
              size="sm"
              overflow="collapse"
              accessibilityLabel={strings.path}
              testID="path"
            >
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
          ) : (
            <Text
              variant="headline-semibold"
              numberOfLines={1}
              accessibilityRole="header"
              testID="title"
            >
              {title}
            </Text>
          )}
        </View>
        {onUpload ? (
          <Button
            size="sm"
            iconOnly
            appearance="plain"
            tone="neutral"
            leadingIcon={RiUploadCloud2Line}
            accessibilityLabel={strings.menus.uploadFiles}
            onPress={onUpload}
            testID="upload"
          />
        ) : null}
        <SegmentedControl
          type="radio"
          size="sm"
          label={strings.view}
          value={viewMode}
          onValueChange={(next) => onViewMode(next === 'list' ? 'list' : 'icons')}
        >
          <SegmentedControlItem
            value="icons"
            accessibilityLabel={strings.asIcons}
            testID="view-icons"
          >
            <Glyph Icon={RiLayoutGridLine} />
          </SegmentedControlItem>
          <SegmentedControlItem value="list" accessibilityLabel={strings.asList} testID="view-list">
            <Glyph Icon={RiListView} />
          </SegmentedControlItem>
        </SegmentedControl>
        {isCompact ? null : <View className="w-48 min-w-28 shrink">{searchField}</View>}
      </WindowDragRegion>
      {isCompact ? <View className="px-2 pb-2">{searchField}</View> : null}
    </View>
  );
}
