import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import SwipeableCourseCards from '../../components/home/SwipeableCourseCards';

const mockNavigate = jest.fn();
let mockGestureHandlers: {
  onStart?: (event: any) => void;
  onUpdate?: (event: any) => void;
  onEnd?: (event: any) => void;
} = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      ScrollView,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (callback: () => unknown) => callback(),
    withSpring: (value: number) => value,
    withTiming: (value: number, _config?: unknown, callback?: () => void) => {
      callback?.();
      return value;
    },
    runOnJS: (fn: (...args: any[]) => any) => fn,
    interpolate: (value: number, input: number[], output: number[]) => {
      if (value <= input[0]) return output[0];
      if (value >= input[input.length - 1]) return output[output.length - 1];
      return output[1];
    },
    Extrapolate: { CLAMP: 'clamp' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    Gesture: {
      Pan: () => ({
        onStart: function (handler: (event: any) => void) {
          mockGestureHandlers.onStart = handler;
          return this;
        },
        onUpdate: function (handler: (event: any) => void) {
          mockGestureHandlers.onUpdate = handler;
          return this;
        },
        onEnd: function (handler: (event: any) => void) {
          mockGestureHandlers.onEnd = handler;
          return this;
        },
      }),
    },
  };
});

jest.mock('../../components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ImageWithFallback: () => <View testID="image-with-fallback" />,
  };
});

describe('SwipeableCourseCards', () => {
  const courses: any[] = [
    {
      id: 'course-1',
      title: 'First Course',
      description: 'First Description',
      image: 'https://example.com/first.jpg',
      category: 'Mobile',
      progress: { completed: 2, total: 10, percentage: 20 },
      instructor: { name: 'John Doe', avatar: 'https://example.com/john.jpg' },
      duration: '5h',
      rating: 4.4,
    },
    {
      id: 'course-2',
      title: 'Second Course',
      description: 'Second Description',
      image: 'https://example.com/second.jpg',
      category: 'Web',
      progress: { completed: 5, total: 10, percentage: 50 },
      instructor: { name: 'Jane Doe', avatar: 'https://example.com/jane.jpg' },
      duration: '7h',
      rating: 4.9,
    },
  ];

  beforeEach(() => {
    mockNavigate.mockClear();
    mockGestureHandlers = {};
  });

  it('renders completed state for empty course list', () => {
    const { getByText } = render(<SwipeableCourseCards courses={[]} />);

    expect(getByText('🎉 All courses reviewed!')).toBeTruthy();
  });

  it('renders current course content and previews', () => {
    const { getByText } = render(<SwipeableCourseCards courses={courses} />);

    expect(getByText('First Course')).toBeTruthy();
    expect(getByText('First Description')).toBeTruthy();
  });

  it('navigates to CourseDetail when pressing main card', () => {
    const { getByText } = render(<SwipeableCourseCards courses={courses} />);

    fireEvent.press(getByText('First Course'));
    expect(mockNavigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'course-1',
    });
  });

  it('calls onToggleWishlist when wishlist button is pressed', () => {
    const onToggleWishlist = jest.fn();
    const { getByLabelText } = render(
      <SwipeableCourseCards
        courses={courses}
        onToggleWishlist={onToggleWishlist}
        isWishlisted={() => false}
      />,
    );

    fireEvent(getByLabelText('Add to wishlist'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(onToggleWishlist).toHaveBeenCalledWith(courses[0]);
  });

  it('renders the remove wishlist label when the current course is already wishlisted', () => {
    const { getByLabelText } = render(
      <SwipeableCourseCards
        courses={courses}
        isWishlisted={(courseId) => courseId === 'course-1'}
      />,
    );

    expect(getByLabelText('Remove from wishlist')).toBeTruthy();
  });

  it('calls onCourseLike and advances after a right swipe', () => {
    const onCourseLike = jest.fn();
    const { getAllByText } = render(
      <SwipeableCourseCards courses={courses} onCourseLike={onCourseLike} />,
    );

    act(() => {
      mockGestureHandlers.onStart?.({});
      mockGestureHandlers.onUpdate?.({ translationX: 500 });
      mockGestureHandlers.onEnd?.({ translationX: 500 });
    });

    expect(onCourseLike).toHaveBeenCalledWith('course-1');
    expect(getAllByText('Second Course').length).toBeGreaterThan(0);
  });

  it('calls onCourseComplete and wraps to the previous course after a left swipe', () => {
    const onCourseComplete = jest.fn();
    const { getAllByText } = render(
      <SwipeableCourseCards
        courses={courses}
        onCourseComplete={onCourseComplete}
      />,
    );

    act(() => {
      mockGestureHandlers.onStart?.({});
      mockGestureHandlers.onUpdate?.({ translationX: -500 });
      mockGestureHandlers.onEnd?.({ translationX: -500 });
    });

    expect(onCourseComplete).toHaveBeenCalledWith('course-1');
    expect(getAllByText('Second Course').length).toBeGreaterThan(0);
  });
});
