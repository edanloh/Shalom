import React from 'react';
import { render } from '@testing-library/react-native';
import Categories from '../components/Categories';

describe('Categories', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      const { toJSON } = render(<Categories />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render the title', () => {
      const { getByText } = render(<Categories />);
      expect(getByText('Explore Categories')).toBeTruthy();
    });

    it('should render the subtitle', () => {
      const { getByText } = render(<Categories />);
      expect(
        getByText('Find the perfect course in your field of interest'),
      ).toBeTruthy();
    });

    it('should render all category names', () => {
      const { getByText } = render(<Categories />);

      const categories = [
        'Programming',
        'Design',
        'Business',
        'Photography',
        'Music',
        'Marketing',
        'Data Science',
        'Languages',
      ];

      categories.forEach((category) => {
        expect(getByText(category)).toBeTruthy();
      });
    });

    it('should render course counts for each category', () => {
      const { getByText } = render(<Categories />);

      expect(getByText('2,500+ courses')).toBeTruthy();
      expect(getByText('1,800+ courses')).toBeTruthy();
      expect(getByText('3,200+ courses')).toBeTruthy();
      expect(getByText('900+ courses')).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should render a FlatList', () => {
      const { getByTestId } = render(<Categories />);
      expect(getByTestId('categories-list')).toBeTruthy();
    });

    it('should have correct number of categories', () => {
      const { getAllByText } = render(<Categories />);
      // Check that we have 8 categories by looking for the "courses" text pattern
      const courseTexts = getAllByText(/courses/);
      expect(courseTexts.length).toBe(8);
    });
  });
});
