import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CourseCarousel from '../../components/home/CourseCarousel';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../contexts/CourseContext', () => ({
  useCourses: () => ({ wishlist: [], toggleWishlist: jest.fn() }),
}));

jest.mock('../../components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ImageWithFallback: () => <View testID="image-with-fallback" />,
  };
});

jest.mock('../../components/common/AnimatedHeartButton', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return function MockAnimatedHeartButton(props: any) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel}
        onPress={props.onPress}
      >
        <Text>{props.filled ? 'heart' : 'heart-outline'}</Text>
      </Pressable>
    );
  };
});

describe('CourseCarousel', () => {
  const courses: any[] = [
    {
      id: 'c1',
      title: 'Course One',
      description: 'Desc one',
      image: 'https://example.com/1.jpg',
      category: 'Mobile',
      categoryColor: '#111111',
      progress_percentage: 40,
      instructor: { name: 'A', avatar: 'https://example.com/a.jpg' },
      duration: '4h',
      rating: 4.2,
    },
    {
      id: 'c2',
      title: 'Course Two',
      description: 'Desc two',
      image: 'https://example.com/2.jpg',
      category: 'Web',
      categoryColor: '#222222',
      progress_percentage: 60,
      instructor: { name: 'B', avatar: 'https://example.com/b.jpg' },
      duration: '6h',
      rating: 4.8,
    },
  ];

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders course content', () => {
    const { getByText } = render(<CourseCarousel courses={courses} />);

    expect(getByText('Course One')).toBeTruthy();
    expect(getByText('Desc one')).toBeTruthy();
  });

  it('navigates to CourseDetail when a card is pressed', () => {
    const { getByText } = render(<CourseCarousel courses={courses} />);

    fireEvent.press(getByText('Course One'));
    expect(mockNavigate).toHaveBeenCalledWith('CourseDetail', {
      courseId: 'c1',
    });
  });

  it('calls onToggleWishlist from heart button', () => {
    const onToggleWishlist = jest.fn();
    const { getAllByLabelText } = render(
      <CourseCarousel
        courses={courses}
        onToggleWishlist={onToggleWishlist}
        isWishlisted={() => false}
      />,
    );

    fireEvent.press(getAllByLabelText('Add to wishlist')[0]);
    expect(onToggleWishlist).toHaveBeenCalledWith(courses[0]);
  });

  it('renders a filled wishlist state when the course is already wishlisted', () => {
    const { getAllByLabelText, getAllByText } = render(
      <CourseCarousel
        courses={courses}
        isWishlisted={(courseId) => courseId === 'c1'}
      />,
    );

    expect(getAllByLabelText('Remove from wishlist')[0]).toBeTruthy();
    expect(getAllByText('heart')[0]).toBeTruthy();
  });

  it('renders fallback values for missing progress, instructor, duration, and rating', () => {
    const sparseCourse: any = {
      id: 'c3',
      title: 'Sparse Course',
      description: 'Fallback details',
      image: 'https://example.com/3.jpg',
      category: 'Misc',
      categoryColor: '#333333',
    };

    const { getByText } = render(<CourseCarousel courses={[sparseCourse]} />);

    expect(getByText('0%')).toBeTruthy();
    expect(getByText('Instructor')).toBeTruthy();
    expect(getByText('14h')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });

  it('renders the limited pagination branch when there are more than ten courses', () => {
    const manyCourses = Array.from({ length: 11 }, (_, index) => ({
      ...courses[index % courses.length],
      id: `course-${index}`,
      title: `Course ${index + 1}`,
    }));

    const { getByText } = render(
      <CourseCarousel courses={manyCourses as any} />,
    );

    expect(getByText('Course 1')).toBeTruthy();
    expect(getByText('Course 11')).toBeTruthy();
  });
});
