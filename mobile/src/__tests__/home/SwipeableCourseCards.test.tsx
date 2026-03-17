import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import SwipeableCourseCards from '../../components/home/SwipeableCourseCards';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
        onStart: function () {
          return this;
        },
        onUpdate: function () {
          return this;
        },
        onEnd: function () {
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
});
