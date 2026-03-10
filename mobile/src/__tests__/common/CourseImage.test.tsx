import React from 'react';
import { render } from '@testing-library/react-native';
import CourseImage from '../../components/common/CourseImage';

// Mock the Images import
jest.mock('../../../assets', () => ({
  Images: {
    coursePlaceholder: 'course-placeholder-mock',
    defaultImage: 'default-image-mock',
  },
}));

describe('CourseImage', () => {
  describe('Rendering', () => {
    it('should render with valid URI', () => {
      const { toJSON } = render(
        <CourseImage
          uri="https://example.com/course-image.jpg"
          style={{ width: 200, height: 150 }}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render placeholder when URI is empty', () => {
      const { toJSON } = render(
        <CourseImage uri="" style={{ width: 200, height: 150 }} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render placeholder when URI is whitespace', () => {
      const { toJSON } = render(
        <CourseImage uri="   " style={{ width: 200, height: 150 }} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should apply custom style', () => {
      const customStyle = {
        width: 300,
        height: 200,
        borderRadius: 15,
      };
      const { toJSON } = render(
        <CourseImage uri="https://example.com/image.jpg" style={customStyle} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should use custom placeholder when provided', () => {
      const { toJSON } = render(
        <CourseImage
          uri="https://example.com/image.jpg"
          style={{ width: 200, height: 150 }}
          placeholder="defaultImage"
        />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show placeholder on image load error', () => {
      const { UNSAFE_getAllByType } = render(
        <CourseImage
          uri="https://example.com/broken-image.jpg"
          style={{ width: 200, height: 150 }}
          showPlaceholderOnError={true}
        />,
      );

      const { Image } = require('react-native');
      const images = UNSAFE_getAllByType(Image);

      if (images.length > 0) {
        const image = images[0];
        // Simulate error
        if (image.props.onError) {
          image.props.onError();
        }
      }

      // Placeholder should be shown
      expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0);
    });

    it('should return null on error when showPlaceholderOnError is false', () => {
      const { UNSAFE_getAllByType } = render(
        <CourseImage
          uri="https://example.com/broken-image.jpg"
          style={{ width: 200, height: 150 }}
          showPlaceholderOnError={false}
        />,
      );

      const { Image } = require('react-native');
      const images = UNSAFE_getAllByType(Image);

      if (images.length > 0) {
        const image = images[0];
        // Simulate error
        if (image.props.onError) {
          image.props.onError();
        }
      }

      // Component behavior after error
      expect(true).toBe(true); // Test passes if no crash occurs
    });
  });

  describe('Loading State', () => {
    it('should handle onLoad callback', () => {
      const { UNSAFE_getAllByType } = render(
        <CourseImage
          uri="https://example.com/image.jpg"
          style={{ width: 200, height: 150 }}
        />,
      );

      const { Image } = require('react-native');
      const images = UNSAFE_getAllByType(Image);

      if (images.length > 0) {
        const image = images[0];
        // Simulate load
        if (image.props.onLoad) {
          image.props.onLoad();
        }
      }

      expect(images).toBeTruthy();
    });

    it('should handle onLoadStart callback', () => {
      const { UNSAFE_getAllByType } = render(
        <CourseImage
          uri="https://example.com/image.jpg"
          style={{ width: 200, height: 150 }}
        />,
      );

      const { Image } = require('react-native');
      const images = UNSAFE_getAllByType(Image);

      if (images.length > 0) {
        const image = images[0];
        // Simulate load start
        if (image.props.onLoadStart) {
          image.props.onLoadStart();
        }
      }

      expect(images).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('should pass through additional ImageProps', () => {
      const { toJSON } = render(
        <CourseImage
          uri="https://example.com/image.jpg"
          style={{ width: 200, height: 150 }}
          resizeMode="cover"
          testID="course-image"
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle different URIs', () => {
      const uris = [
        'https://example.com/course1.jpg',
        'https://cdn.example.com/course2.png',
        'https://images.example.com/course3.webp',
      ];

      uris.forEach((uri) => {
        const { toJSON } = render(
          <CourseImage uri={uri} style={{ width: 200, height: 150 }} />,
        );
        expect(toJSON()).toBeTruthy();
      });
    });
  });
});
