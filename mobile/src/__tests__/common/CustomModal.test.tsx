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
});
