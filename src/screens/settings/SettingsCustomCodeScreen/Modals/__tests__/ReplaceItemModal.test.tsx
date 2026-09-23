import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ReplaceItemModal from '../ReplaceItemModal';

const mockStore: { replaceText: Record<string, string>; removeText: string[] } =
  {
    replaceText: {},
    removeText: ['existing-entry'],
  };
const mockSetChapterReaderSettings = jest.fn(
  (values: Partial<typeof mockStore>) => {
    Object.assign(mockStore, values);
  },
);
const mockToggleList = jest.fn();

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({
    background: '#000000',
    primary: '#111111',
  }),
  useChapterReaderSettings: () => ({
    replaceText: mockStore.replaceText,
    removeText: mockStore.removeText,
    setChapterReaderSettings: mockSetChapterReaderSettings,
  }),
}));

// useBoolean is pure React state with no native dependencies, so test the real
// hook instead of maintaining a local reimplementation that can drift.
jest.mock('@hooks/index', () => ({
  useBoolean: jest.requireActual('@hooks/common/useBoolean').default,
}));

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@components', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Section = ({ children }: { children: React.ReactNode }) =>
    ReactModule.createElement(View, null, children);

  return {
    AnimatedIconButton: () => null,
    Dialog: {
      Root: ({
        visible,
        children,
      }: {
        visible: boolean;
        children: React.ReactNode;
      }) =>
        visible
          ? ReactModule.createElement(View, { testID: 'dialog-root' }, children)
          : null,
      Header: Section,
      Title: Section,
      Content: Section,
      Actions: Section,
      Action: ({
        onPress,
        children,
      }: {
        onPress: () => void;
        children: React.ReactNode;
      }) => ReactModule.createElement(Text, { onPress }, children),
    },
    List: {
      Item: ({ onPress, title }: { onPress: () => void; title: string }) =>
        ReactModule.createElement(
          Pressable,
          { testID: 'add-remove-item', onPress },
          ReactModule.createElement(Text, null, title),
        ),
    },
  };
});

jest.mock('react-native-paper', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { TextInput: NativeTextInput } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    TextInput: (props: Record<string, unknown>) =>
      ReactModule.createElement(NativeTextInput, {
        ...props,
        testID: props.label as string,
      }),
  };
});

// Mirror the real list: rows only refresh when the data reference changes,
// so passing the same (mutated) array back keeps showing stale rows.
jest.mock('@legendapp/list/react-native', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LegendList: ({ data, renderItem }: any) => {
      const cache = ReactModule.useRef<{ data: unknown; rows: unknown }>({
        data: null,
        rows: null,
      });
      if (cache.current.data !== data) {
        cache.current = {
          data,
          rows: (data || []).map((item: any, index: number) =>
            ReactModule.createElement(
              ReactModule.Fragment,
              { key: `row-${index}` },
              renderItem({ item, index }),
            ),
          ),
        };
      }
      return ReactModule.createElement(View, null, cache.current.rows as any);
    },
  };
});

jest.mock('../../Components/ListItems', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LIST_ITEM_HEIGHT: 40,
    RemoveItem: ({ item }: { item: string }) =>
      ReactModule.createElement(Text, null, item),
    ReplaceItem: () => null,
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: () => null,
}));

describe('ReplaceItemModal (remove list)', () => {
  beforeEach(() => {
    mockStore.replaceText = {};
    mockStore.removeText = ['existing-entry'];
    mockSetChapterReaderSettings.mockClear();
    mockToggleList.mockClear();
  });

  it('shows a newly saved entry without a restart', () => {
    const view = render(
      <ReplaceItemModal listExpanded={false} toggleList={mockToggleList} />,
    );
    const originalRef = mockStore.removeText;

    expect(screen.getByText('existing-entry')).toBeTruthy();

    fireEvent.press(screen.getByTestId('add-remove-item'));
    fireEvent.changeText(
      screen.getByTestId('common.textToReplace'),
      'brand-new-entry',
    );
    fireEvent.press(screen.getByText('Save'));

    expect(mockSetChapterReaderSettings).toHaveBeenCalledTimes(1);
    const saved = mockSetChapterReaderSettings.mock.calls[0][0]
      .removeText as string[];
    expect(saved).toEqual(['existing-entry', 'brand-new-entry']);
    // The list keys re-rendering off the data reference: saving must hand
    // back a fresh array, never the same (mutated) reference.
    expect(saved).not.toBe(originalRef);
    expect(originalRef).toEqual(['existing-entry']);

    // The entry appears on the next render with the saved settings,
    // with no restart/remount in between.
    view.rerender(
      <ReplaceItemModal listExpanded={false} toggleList={mockToggleList} />,
    );
    expect(screen.getByText('brand-new-entry')).toBeTruthy();
  });
});
