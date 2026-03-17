import React from 'react';
import { render } from '@testing-library/react-native';
import Hero from '../components/Hero';

describe('Hero', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      const { toJSON } = render(<Hero />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render the badge text', () => {
      const { getByText } = render(<Hero />);
      expect(getByText('#1 Learning Platform')).toBeTruthy();
    });

    it('should render the main title', () => {
      const { getAllByText } = render(<Hero />);
      expect(getAllByText(/Learn/).length).toBeGreaterThan(0);
      expect(getAllByText(/Anything/).length).toBeGreaterThan(0);
      expect(getAllByText(/Online/).length).toBeGreaterThan(0);
    });

    it('should render the subtitle', () => {
      const { getByText } = render(<Hero />);
      expect(
        getByText(/Discover thousands of courses from expert instructors/),
      ).toBeTruthy();
    });

    it('should render CTA buttons', () => {
      const { getByText } = render(<Hero />);
      expect(getByText('Start Learning Free')).toBeTruthy();
      expect(getByText('Browse Courses')).toBeTruthy();
    });

    it('should render stats section', () => {
      const { getByText } = render(<Hero />);

      expect(getByText('10M+')).toBeTruthy();
      expect(getByText('Students')).toBeTruthy();
      expect(getByText('50K+')).toBeTruthy();
      expect(getByText('Courses')).toBeTruthy();
      expect(getByText('4.9')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
    });

    it('should render floating badge texts', () => {
      const { getByText } = render(<Hero />);
      expect(getByText('Live Classes')).toBeTruthy();
      expect(getByText('Expert Instructors')).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should render a ScrollView', () => {
      const { getByTestId } = render(<Hero />);
      expect(getByTestId('hero-scroll')).toBeTruthy();
    });

    it('should render hero image', () => {
      const { getByTestId } = render(<Hero />);
      expect(getByTestId('hero-image')).toBeTruthy();
    });

    it('should render TouchableOpacity buttons', () => {
      const { getByTestId } = render(<Hero />);
      expect(getByTestId('cta-primary')).toBeTruthy();
      expect(getByTestId('cta-secondary')).toBeTruthy();
    });
  });

  describe('Stats Content', () => {
    it('should display all three stat values', () => {
      const { getByText } = render(<Hero />);

      const studentsStat = getByText('10M+');
      const coursesStat = getByText('50K+');
      const ratingStat = getByText('4.9');

      expect(studentsStat).toBeTruthy();
      expect(coursesStat).toBeTruthy();
      expect(ratingStat).toBeTruthy();
    });

    it('should display all stat labels', () => {
      const { getByText } = render(<Hero />);

      expect(getByText('Students')).toBeTruthy();
      expect(getByText('Courses')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
    });
  });

  describe('Floating Badges', () => {
    it('should render both floating badges', () => {
      const { getByText } = render(<Hero />);

      const liveClasses = getByText('Live Classes');
      const expertInstructors = getByText('Expert Instructors');

      expect(liveClasses).toBeTruthy();
      expect(expertInstructors).toBeTruthy();
    });
  });
});
