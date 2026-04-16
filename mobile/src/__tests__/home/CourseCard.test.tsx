import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CourseCard from '../../components/home/CourseCard';

const mockToggleWishlist = jest.fn();

jest.mock('../../contexts/CourseContext', () => ({
  useCourses: () => ({
    wishlist: [],
    toggleWishlist: mockToggleWishlist,
  }),
}));

jest.mock('../../components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ImageWithFallback: ({ children }: { children?: React.ReactNode }) => (
      <View testID="image-with-fallback">{children}</View>
    ),
  };
});

describe('CourseCard', () => {
  const course: any = {
    id: 'course-1',
    title: 'React Native Basics',
    description: 'Build apps',
    image: 'https://example.com/course.jpg',
    category: 'Mobile',
    categoryColor: '#123456',
    rating: 4.6,
    modules: 12,
    duration: '8h',
    instructor: { name: 'Alice', avatar: 'https://example.com/avatar.jpg' },
    recommendationPrimaryTag: 'popular_now',
    recommendationRank: 2,
    recommendationScore: 0.97,
    progress: { percentage: 67 },
  };

  beforeEach(() => {
    mockToggleWishlist.mockClear();
  });

  it('renders key course details', () => {
    const { getByText } = render(<CourseCard course={course} />);

    expect(getByText('React Native Basics')).toBeTruthy();
    expect(getByText('4.6')).toBeTruthy();
    expect(getByText('12 modules')).toBeTruthy();
    expect(getByText('Popular right now')).toBeTruthy();
    expect(getByText('#2')).toBeTruthy();
  });

  it('calls onPress with course when card is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CourseCard course={course} onPress={onPress} />,
    );

    fireEvent.press(getByText('React Native Basics'));
    expect(onPress).toHaveBeenCalledWith(course);
  });

  it('toggles wishlist when heart button is pressed', () => {
    const { getByLabelText } = render(<CourseCard course={course} />);

    fireEvent(getByLabelText('Add to wishlist'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(mockToggleWishlist).toHaveBeenCalledWith(course);
  });

  it('renders progress variant completion text', () => {
    const { getByText } = render(
      <CourseCard course={course} variant="progress" />,
    );

    expect(getByText('67% complete')).toBeTruthy();
  });
});
