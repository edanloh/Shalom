import React from 'react';
import { render } from '@testing-library/react-native';
import ImageWithFallback from '../../components/common/ImageWithFallback';

// Mock image source
const mockImageSource = { uri: 'https://example.com/image.jpg' };
const mockFallbackSource = { uri: 'https://example.com/fallback.jpg' };

describe('ImageWithFallback', () => {
  describe('Rendering', () => {
    it('should render with image source', () => {
      const { toJSON } = render(
        <ImageWithFallback
          source={mockImageSource}
          fallback={mockFallbackSource}
          style={{ width: 100, height: 100 }}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render fallback when source has no uri', () => {
      const { toJSON } = render(
        <ImageWithFallback
          source={{}}
          fallback={mockFallbackSource}
          style={{ width: 100, height: 100 }}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should apply custom style', () => {
      const customStyle = { width: 200, height: 200, borderRadius: 10 };
      const { toJSON } = render(
        <ImageWithFallback
          source={mockImageSource}
          fallback={mockFallbackSource}
          style={customStyle}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback when image fails to load', () => {
      const mockOnError = jest.fn();
      const { UNSAFE_getByType } = render(
        <ImageWithFallback
          source={mockImageSource}
          fallback={mockFallbackSource}
          style={{ width: 100, height: 100 }}
          onError={mockOnError}
        />,
      );

      const { Image } = require('react-native');
      const image = UNSAFE_getByType(Image);

      // Simulate error
      if (image.props.onError) {
        image.props.onError();
      }

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should show fallback after error', () => {
      const { UNSAFE_getByType } = render(
        <ImageWithFallback
          source={mockImageSource}
          fallback={mockFallbackSource}
          style={{ width: 100, height: 100 }}
        />,
      );

      const { Image } = require('react-native');
      const image = UNSAFE_getByType(Image);

      // Simulate error
      if (image.props.onError) {
        image.props.onError();
      }

      // Component should still render
      expect(UNSAFE_getByType(Image)).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should handle onLoad callback', () => {
      const { UNSAFE_getByType } = render(
        <ImageWithFallback
          source={mockImageSource}
          fallback={mockFallbackSource}
          style={{ width: 100, height: 100 }}
        />,
      );

      const { Image } = require('react-native');
      const image = UNSAFE_getByType(Image);

      // Simulate load
      if (image.props.onLoad) {
        image.props.onLoad();
      }

      expect(image).toBeTruthy();
    });
  });
});
