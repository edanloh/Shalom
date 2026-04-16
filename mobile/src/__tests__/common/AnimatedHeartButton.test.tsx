import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AnimatedHeartButton from '../../components/common/AnimatedHeartButton';

describe('AnimatedHeartButton', () => {
  it('renders with default accessibility role and label', () => {
    const { getByRole } = render(
      <AnimatedHeartButton filled={false} accessibilityLabel="wishlist" />,
    );

    expect(getByRole('button')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <AnimatedHeartButton
        filled={true}
        accessibilityLabel="toggle-heart"
        onPress={onPress}
      />,
    );

    fireEvent.press(getByLabelText('toggle-heart'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not throw when pressed without onPress handler', () => {
    const { getByLabelText } = render(
      <AnimatedHeartButton filled={false} accessibilityLabel="animate-heart" />,
    );

    expect(() => fireEvent.press(getByLabelText('animate-heart'))).not.toThrow();
  });

  it('renders filled heart icon when filled is true', () => {
    const { getByLabelText } = render(
      <AnimatedHeartButton filled={true} accessibilityLabel="filled-heart" />,
    );

    expect(getByLabelText('filled-heart')).toBeTruthy();
  });
});
