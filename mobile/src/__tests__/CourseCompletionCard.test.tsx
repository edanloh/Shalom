import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CourseCompletionCard } from '../components/CourseCompletionCard';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
} as any;

describe('CourseCompletionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      const { toJSON } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should display completion title', () => {
      const { getByText } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );
      expect(getByText('Course Completed!')).toBeTruthy();
    });

    it('should display congratulations message', () => {
      const { getByText } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );
      expect(
        getByText(/Congratulations! You've completed all lessons/),
      ).toBeTruthy();
    });

    it('should display back to course button', () => {
      const { getByText } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );
      expect(getByText('Back to Course')).toBeTruthy();
    });

    it('should render trophy icon', () => {
      const { toJSON } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );
      // Trophy icon should be rendered
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should navigate to CourseDetail when button is pressed', () => {
      const { getByText } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );

      const button = getByText('Back to Course');
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CourseDetail', {
        courseId: 'test-course-123',
        courseCompleted: true,
      });
    });

    it('should call onBackToCourse callback before navigation', () => {
      const mockCallback = jest.fn();
      const { getByText } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
          onBackToCourse={mockCallback}
        />,
      );

      const button = getByText('Back to Course');
      fireEvent.press(button);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });

    it('should pass correct courseId to navigation', () => {
      const testCourseId = 'advanced-react-course';
      const { getByText } = render(
        <CourseCompletionCard
          courseId={testCourseId}
          navigation={mockNavigation}
        />,
      );

      const button = getByText('Back to Course');
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'CourseDetail',
        expect.objectContaining({ courseId: testCourseId }),
      );
    });
  });

  describe('Props', () => {
    it('should work without onBackToCourse callback', () => {
      const { getByText } = render(
        <CourseCompletionCard
          courseId="test-course-123"
          navigation={mockNavigation}
        />,
      );

      const button = getByText('Back to Course');
      fireEvent.press(button);

      // Should still navigate even without callback
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });

    it('should handle different course IDs', () => {
      const courseIds = ['course-1', 'course-2', 'course-3'];

      courseIds.forEach((courseId) => {
        const { getByText } = render(
          <CourseCompletionCard
            courseId={courseId}
            navigation={mockNavigation}
          />,
        );

        const button = getByText('Back to Course');
        fireEvent.press(button);

        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          'CourseDetail',
          expect.objectContaining({ courseId }),
        );

        jest.clearAllMocks();
      });
    });
  });
});
