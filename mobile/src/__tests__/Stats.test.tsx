import React from 'react';
import { render } from '@testing-library/react-native';
import Stats from '../components/Stats';

describe('Stats', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      const { toJSON } = render(<Stats />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render the title', () => {
      const { getByText } = render(<Stats />);
      expect(getByText('Trusted by Millions Worldwide')).toBeTruthy();
    });

    it('should render the subtitle', () => {
      const { getByText } = render(<Stats />);
      expect(
        getByText('Join our global community of learners and instructors'),
      ).toBeTruthy();
    });

    it('should render all stat values', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('10M+')).toBeTruthy();
      expect(getByText('50K+')).toBeTruthy();
      expect(getByText('15K+')).toBeTruthy();
      expect(getByText('190+')).toBeTruthy();
    });

    it('should render all stat labels', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('Active Students')).toBeTruthy();
      expect(getByText('Online Courses')).toBeTruthy();
      expect(getByText('Expert Instructors')).toBeTruthy();
      expect(getByText('Countries')).toBeTruthy();
    });

    it('should render stat descriptions', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('Learning worldwide')).toBeTruthy();
      expect(getByText('In various topics')).toBeTruthy();
      expect(getByText('Teaching students')).toBeTruthy();
      expect(getByText('Students enrolled')).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should render a ScrollView', () => {
      const { getByTestId } = render(<Stats />);
      expect(getByTestId('stats-scroll')).toBeTruthy();
    });

    it('should have correct number of stat items', () => {
      const { getByText } = render(<Stats />);
      // Verify we have 4 stats by checking each unique value exists
      expect(getByText('10M+')).toBeTruthy();
      expect(getByText('50K+')).toBeTruthy();
      expect(getByText('15K+')).toBeTruthy();
      expect(getByText('190+')).toBeTruthy();
    });
  });

  describe('Content Verification', () => {
    it('should display students stat correctly', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('10M+')).toBeTruthy();
      expect(getByText('Active Students')).toBeTruthy();
      expect(getByText('Learning worldwide')).toBeTruthy();
    });

    it('should display courses stat correctly', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('50K+')).toBeTruthy();
      expect(getByText('Online Courses')).toBeTruthy();
      expect(getByText('In various topics')).toBeTruthy();
    });

    it('should display instructors stat correctly', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('15K+')).toBeTruthy();
      expect(getByText('Expert Instructors')).toBeTruthy();
      expect(getByText('Teaching students')).toBeTruthy();
    });

    it('should display countries stat correctly', () => {
      const { getByText } = render(<Stats />);

      expect(getByText('190+')).toBeTruthy();
      expect(getByText('Countries')).toBeTruthy();
      expect(getByText('Students enrolled')).toBeTruthy();
    });
  });
});
