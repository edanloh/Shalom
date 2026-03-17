import React from 'react';
import { Animated } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import AnimatedHeartButton from '../../components/common/AnimatedHeartButton';

describe('AnimatedHeartButton', () => {
  const mockStart = jest.fn();

  beforeEach(() => {
    mockStart.mockClear();
    jest.spyOn(Animated, 'timing').mockReturnValue({ start: mockStart } as any);
    jest.spyOn(Animated, 'spring').mockReturnValue({ start: mockStart } as any);
    jest
      .spyOn(Animated, 'sequence')
      .mockReturnValue({ start: mockStart } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('runs animation sequence on press', () => {
    const { getByLabelText } = render(
      <AnimatedHeartButton filled={false} accessibilityLabel="animate-heart" />,
    );

    fireEvent.press(getByLabelText('animate-heart'));

    expect(Animated.sequence).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalled();
  });
});
