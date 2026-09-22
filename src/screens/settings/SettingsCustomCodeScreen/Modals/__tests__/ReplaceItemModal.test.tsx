import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';

import ReplaceItemModal from '../ReplaceItemModal';

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
    replaceText: { foo: 'bar' },
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
    }) =>
      ReactModule.createElement(
        ScrollView,
        { testID: 'legend-list', style },
        data.map((item, index) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: index },
            renderItem({ item, index }),
          ),
        ),
      ),
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

describe('ReplaceItemModal', () => {
  it('bounds the remove list viewport so overflow entries stay reachable', () => {
    render(<ReplaceItemModal listExpanded={false} toggleList={jest.fn()} />);

    const viewport = screen.getByTestId('legend-list');
    expectListToFillItsContainer();

    for (const word of mockRemoveText) {
      expect(within(viewport).getByText(word)).toBeTruthy();
    }
  });

  it('bounds the replace list viewport', () => {
    render(
      <ReplaceItemModal showReplace listExpanded toggleList={jest.fn()} />,
    );

    const viewport = screen.getByTestId('legend-list');
    expectListToFillItsContainer();

    expect(within(viewport).getByText('foo')).toBeTruthy();
    expect(within(viewport).getByText('bar')).toBeTruthy();
  });
});
