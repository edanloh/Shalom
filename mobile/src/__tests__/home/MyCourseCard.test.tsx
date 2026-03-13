import React from 'react';
import { render } from '@testing-library/react-native';
import MyCourseCard from '../../components/home/MyCourseCard';

describe('MyCourseCard', () => {
  it('renders title, subtitle, and module progress', () => {
    const { getByText } = render(
      <MyCourseCard
        title="Advanced React"
        subtitle="Hooks and patterns"
        image="https://example.com/course.jpg"
        completedModules={4}
        totalModules={10}
        completion={40}
        duration="9h"
        rating={4.7}
        instructor="Jane Doe"
        instructorAvatar="https://example.com/instructor.jpg"
        category="Frontend"
      />,
    );

    expect(getByText('Advanced React')).toBeTruthy();
    expect(getByText('Hooks and patterns')).toBeTruthy();
    expect(getByText('4 of 10 modules completed')).toBeTruthy();
  });

  it('renders instructor/category and stats', () => {
    const { getByText } = render(
      <MyCourseCard
        title="Advanced React"
        subtitle="Hooks and patterns"
        image="https://example.com/course.jpg"
        completedModules={4}
        totalModules={10}
        completion={40}
        duration="9h"
        rating={4.7}
        instructor="Jane Doe"
        instructorAvatar="https://example.com/instructor.jpg"
        category="Frontend"
      />,
    );

    expect(getByText('Jane Doe')).toBeTruthy();
    expect(getByText('Frontend')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();
    expect(getByText('9h')).toBeTruthy();
    expect(getByText('4.7')).toBeTruthy();
  });
});
