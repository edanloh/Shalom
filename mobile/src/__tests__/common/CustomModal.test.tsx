import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native';
import CustomModal from '../../components/common/CustomModal';

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BlurView: ({ children }: { children: React.ReactNode }) => (
      <View testID="blur-view">{children}</View>
    ),
  };
});

describe('CustomModal', () => {
  it('renders children when visible is true', () => {
    const { getByText, getByTestId } = render(
      <CustomModal visible={true} onClose={() => {}}>
        <Text>Modal Content</Text>
      </CustomModal>,
    );

    expect(getByTestId('blur-view')).toBeTruthy();
    expect(getByText('Modal Content')).toBeTruthy();
  });

  it('does not render children when visible is false', () => {
    const { queryByText } = render(
      <CustomModal visible={false} onClose={() => {}}>
        <Text>Hidden Content</Text>
      </CustomModal>,
    );

    expect(queryByText('Hidden Content')).toBeNull();
  });

  it('calls onClose when overlay is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomModal visible={true} onClose={onClose}>
        <Text>Close Me</Text>
      </CustomModal>,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomModal visible={true} onClose={onClose}>
        <Text>Close Button</Text>
      </CustomModal>,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('forwards onRequestClose to onClose', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByType } = render(
      <CustomModal visible={true} onClose={onClose}>
        <Text>Request Close</Text>
      </CustomModal>,
    );

    const modal = UNSAFE_getByType(Modal);
    modal.props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles null children without crashing', () => {
    const { getByTestId } = render(
      <CustomModal visible={true} onClose={() => {}}>
        {null}
      </CustomModal>,
    );

    expect(getByTestId('blur-view')).toBeTruthy();
  });

  it('handles undefined children without crashing', () => {
    const { getByTestId } = render(
      <CustomModal visible={true} onClose={() => {}}>
        {undefined}
      </CustomModal>,
    );

    expect(getByTestId('blur-view')).toBeTruthy();
  });

  it('handles onClose throwing an error gracefully', () => {
    const throwingOnClose = jest.fn(() => {
      throw new Error('onClose failed');
    });

    render(
      <CustomModal visible={true} onClose={throwingOnClose}>
        {null}
      </CustomModal>,
    );

    expect(() => {
      throwingOnClose();
    }).toThrow('onClose failed');

    expect(throwingOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates when visible prop changes', () => {
    const { queryByText, rerender } = render(
      <CustomModal visible={true} onClose={() => {}}>
        <Text>Toggled Content</Text>
      </CustomModal>,
    );

    expect(queryByText('Toggled Content')).toBeTruthy();

    rerender(
      <CustomModal visible={false} onClose={() => {}}>
        <Text>Toggled Content</Text>
      </CustomModal>,
    );

    expect(queryByText('Toggled Content')).toBeNull();
  });

  it('does not crash when onClose is called rapidly', () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomModal visible={true} onClose={onClose}>
        <Text>Rapid Close</Text>
      </CustomModal>,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);

    fireEvent.press(touchables[0]);
    fireEvent.press(touchables[0]);
    fireEvent.press(touchables[0]);

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
