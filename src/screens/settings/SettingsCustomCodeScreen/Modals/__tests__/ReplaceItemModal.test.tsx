import React from 'react';
import { render, screen } from '@testing-library/react-native';

import ReplaceItemModal from '../ReplaceItemModal';

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
  const { View } =
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
      style?: React.ComponentProps<typeof View>['style'];
    }) =>
      ReactModule.createElement(
        View,
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

describe('ReplaceItemModal', () => {
  it('bounds the remove list viewport so overflow entries stay reachable', () => {
    render(<ReplaceItemModal listExpanded={false} toggleList={jest.fn()} />);

    expect(screen.getByTestId('legend-list')).toHaveStyle({ flex: 1 });

    for (const word of mockRemoveText) {
      expect(screen.getByText(word)).toBeTruthy();
    }
  });

  it('bounds the replace list viewport', () => {
    render(
      <ReplaceItemModal showReplace listExpanded toggleList={jest.fn()} />,
    );

    expect(screen.getByTestId('legend-list')).toHaveStyle({ flex: 1 });
    expect(screen.getByText('foo')).toBeTruthy();
    expect(screen.getByText('bar')).toBeTruthy();
  });
});
