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
    Button: ({
      onPress,
      children,
    }: {
      onPress: () => void;
      children: React.ReactNode;
    }) =>
      ReactModule.createElement(
        Pressable,
        { onPress },
        ReactModule.createElement(Text, null, children),
      ),
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
  };
});

jest.mock('react-native-paper', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Text: NativeText, TextInput: NativeTextInput } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Text: NativeText,
    TextInput: (props: Record<string, unknown>) =>
      ReactModule.createElement(NativeTextInput, {
        ...props,
        testID: props.label as string,
      }),
  };
});

jest.mock('../../Components/ListItems', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LIST_ITEM_HEIGHT: 40,
    RemoveItem: ({
      item,
      index,
      removeItem,
      editItem,
    }: {
      item: string;
      index: number;
      removeItem: (identifier: string | number) => void;
      editItem: (item: string[]) => void;
    }) =>
      ReactModule.createElement(
        View,
        null,
        ReactModule.createElement(
          Text,
          { onPress: () => editItem([item]) },
          item,
        ),
        ReactModule.createElement(
          Text,
          { onPress: () => removeItem(index) },
          `delete-${item}`,
        ),
      ),
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
  });

  it('shows a newly saved entry without a restart', () => {
    const view = render(<ReplaceItemModal />);
    const originalRef = mockStore.removeText;

    expect(screen.getByText('existing-entry')).toBeTruthy();

    fireEvent.press(
      screen.getByText('customCodeSettings.addRemoveRule'),
    );
    fireEvent.changeText(
      screen.getByTestId('customCodeSettings.removeText'),
      'brand-new-entry',
    );
    fireEvent.press(screen.getByText('common.save'));

    expect(mockSetChapterReaderSettings).toHaveBeenCalledTimes(1);
    const saved = mockSetChapterReaderSettings.mock.calls[0][0]
      .removeText as string[];
    expect(saved).toEqual(['existing-entry', 'brand-new-entry']);
    expect(saved).not.toBe(originalRef);
    expect(originalRef).toEqual(['existing-entry']);

    view.rerender(<ReplaceItemModal />);
    expect(screen.getByText('brand-new-entry')).toBeTruthy();
  });

  it('removes an entry with a fresh array reference', () => {
    mockStore.removeText = ['existing-entry', 'doomed-entry'];
    const view = render(<ReplaceItemModal />);
    const originalRef = mockStore.removeText;

    fireEvent.press(screen.getByText('delete-doomed-entry'));

    expect(mockSetChapterReaderSettings).toHaveBeenCalledTimes(1);
    const saved = mockSetChapterReaderSettings.mock.calls[0][0]
      .removeText as string[];
    expect(saved).toEqual(['existing-entry']);
    expect(saved).not.toBe(originalRef);
    expect(originalRef).toEqual(['existing-entry', 'doomed-entry']);

    view.rerender(<ReplaceItemModal />);
    expect(screen.getByText('existing-entry')).toBeTruthy();
    expect(screen.queryByText('doomed-entry')).toBeNull();
  });

  it('rejects editing an entry to a value that already exists', () => {
    mockStore.removeText = ['alpha-entry', 'beta-entry'];
    render(<ReplaceItemModal />);

    fireEvent.press(screen.getByText('alpha-entry'));
    fireEvent.changeText(
      screen.getByTestId('customCodeSettings.removeText'),
      'beta-entry',
    );
    fireEvent.press(screen.getByText('common.save'));

    expect(mockSetChapterReaderSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId('dialog-root')).toBeTruthy();
  });

  it('recovers when the edited entry is gone instead of dropping the save', () => {
    const view = render(<ReplaceItemModal />);

    fireEvent.press(screen.getByText('existing-entry'));
    mockStore.removeText = ['unrelated-entry'];
    view.rerender(<ReplaceItemModal />);
    const currentRef = mockStore.removeText;

    fireEvent.changeText(
      screen.getByTestId('customCodeSettings.removeText'),
      'recovered-entry',
    );
    fireEvent.press(screen.getByText('common.save'));

    expect(mockSetChapterReaderSettings).toHaveBeenCalledTimes(1);
    const saved = mockSetChapterReaderSettings.mock.calls[0][0]
      .removeText as string[];
    expect(saved).toEqual(['unrelated-entry', 'recovered-entry']);
    expect(saved).not.toBe(currentRef);

    view.rerender(<ReplaceItemModal />);
    expect(screen.getByText('recovered-entry')).toBeTruthy();
  });
});
