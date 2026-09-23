import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';

import ReplaceItemModal from '../ReplaceItemModal';
import { LIST_ITEM_HEIGHT } from '../../Components/ListItems';

// Mock reanimated — setUpTests in global setup may have failed.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const entering = { duration: () => ({}) };
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: unknown) => c,
    },
    View,
    createAnimatedComponent: (c: unknown) => c,
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withTiming: (val: unknown) => val,
    FadeIn: entering,
    FadeOut: entering,
  };
});

const mockRemoveText = Array.from({ length: 10 }, (_, i) => `word-${i}`);

jest.mock('@hooks/index', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');

  return {
    useBoolean: (initial = false) => {
      const [value, setValue] = ReactModule.useState(initial);
      return {
        value,
        setTrue: () => setValue(true),
        setFalse: () => setValue(false),
        setValue,
      };
    },
  };
});

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({
    background: '#000000',
    onBackground: '#ffffff',
    primary: '#006666',
  }),
  useChapterReaderSettings: () => ({
    setChapterReaderSettings: jest.fn(),
    replaceText: { foo: 'bar', baz: 'qux' },
    removeText: mockRemoveText,
  }),
}));

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@components', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Section = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(View, null, children);

  return {
    List: {
      Item: ({ title }: { title: string }) =>
        ReactModule.createElement(Text, null, title),
    },
    Dialog: {
      Root: Section,
      Header: Section,
      Title: Section,
      Content: Section,
      Actions: Section,
      Action: Section,
    },
    AnimatedIconButton: () => null,
  };
});

jest.mock('@legendapp/list/react-native', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { ScrollView } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    LegendList: ({
      data,
      renderItem,
      style,
      nestedScrollEnabled,
      keyExtractor,
      estimatedItemSize,
    }: {
      data: string[] | [string, string][];
      renderItem: ({
        item,
        index,
      }: {
        item: string | [string, string];
        index: number;
      }) => React.ReactElement;
      style?: React.ComponentProps<typeof ScrollView>['style'];
      nestedScrollEnabled?: boolean;
      keyExtractor?: (item: string | [string, string], index: number) => string;
      estimatedItemSize?: number;
    }) => {
      // LegendList-only props ride on the ScrollView stand-in so tests can
      // lock them; the stand-in ignores the extras at runtime.
      const scrollProps = {
        testID: 'legend-list',
        style,
        nestedScrollEnabled,
        keyExtractor,
        estimatedItemSize,
      };
      return ReactModule.createElement(
        ScrollView,
        scrollProps,
        data.map((item, index) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: index },
            renderItem({ item, index }),
          ),
        ),
      );
    },
  };
});

jest.mock('@react-native-vector-icons/material-design-icons', () => 'Icon');

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: () => null,
}));

jest.mock('react-native-paper', () => {
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    TextInput: () => null,
    Text,
  };
});

const expectListToFillItsContainer = () => {
  const list = screen.getByTestId('legend-list');
  expect(StyleSheet.flatten(list.props.style)?.flex).toBeGreaterThan(0);

  // Walk up to the host view carrying the animated numeric height: `list.parent`
  // is the composite ScrollView impl, not the bounded container.
  let node: typeof list | null = list;
  let containerStyle: ViewStyle | undefined;
  while (node) {
    const s: ViewStyle | undefined = StyleSheet.flatten(node.props.style);
    if (s && typeof s.height === 'number') {
      containerStyle = s;
      break;
    }
    node = node.parent;
  }
  expect(containerStyle?.height).toBeGreaterThan(0);
  expect(containerStyle?.overflow).toBe('hidden');
};

const expectNestedScrollEnabled = () => {
  const viewport = screen.getByTestId('legend-list');
  // The parent Custom Code ScrollView otherwise intercepts vertical gestures
  // (emulator proof on PR head): without this the list never scrolls by touch.
  // Jest cannot observe gesture dispatch; real scrolling coverage rests on that
  // emulator proof — this locks the prop against regression.
  expect(viewport.props.nestedScrollEnabled).toBe(true);
};

const expectItemLayoutContract = (items: (string | [string, string])[]) => {
  const viewport = screen.getByTestId('legend-list');
  // Rows are a fixed LIST_ITEM_HEIGHT, so LegendList can skip measuring.
  expect(viewport.props.estimatedItemSize).toBe(LIST_ITEM_HEIGHT);
  // Stable keys keep recycled rows bound to the right entry after an
  // edit (replace keys) or a removal (remove indices shift).
  const { keyExtractor } = viewport.props;
  expect(typeof keyExtractor).toBe('function');
  expect(
    new Set(items.map((item, index) => keyExtractor(item, index))).size,
  ).toBe(items.length);
};

describe('ReplaceItemModal', () => {
  it('bounds the remove list viewport so overflow entries stay reachable', () => {
    render(<ReplaceItemModal listExpanded={false} toggleList={jest.fn()} />);

    const viewport = screen.getByTestId('legend-list');
    expectListToFillItsContainer();

    for (const word of mockRemoveText) {
      expect(within(viewport).getByText(word)).toBeTruthy();
    }
    expectNestedScrollEnabled();
    expectItemLayoutContract(mockRemoveText);
  });

  it('bounds the replace list viewport', () => {
    render(
      <ReplaceItemModal showReplace listExpanded toggleList={jest.fn()} />,
    );

    const viewport = screen.getByTestId('legend-list');
    expectListToFillItsContainer();

    expect(within(viewport).getByText('foo')).toBeTruthy();
    expect(within(viewport).getByText('bar')).toBeTruthy();
    expect(within(viewport).getByText('baz')).toBeTruthy();
    expect(within(viewport).getByText('qux')).toBeTruthy();
    expectNestedScrollEnabled();
    expectItemLayoutContract([
      ['foo', 'bar'],
      ['baz', 'qux'],
    ]);
    // Content-based, not index-based: the key follows the entry, not the row.
    expect(viewport.props.keyExtractor(['baz', 'qux'], 0)).toBe('baz');
  });
});
