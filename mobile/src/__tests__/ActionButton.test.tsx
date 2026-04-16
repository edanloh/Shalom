import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ActionButton from '../components/ActionButton';

describe('ActionButton', () => {
  describe('Rendering', () => {
    it('should render with text', () => {
      const { getByText } = render(
        <ActionButton onPress={() => {}} text="Click Me" />,
      );
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render with primary variant by default', () => {
      const { getByTestId } = render(
        <ActionButton onPress={() => {}} text="Primary" />,
      );
      const style = getByTestId('action-button').props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
      expect(flat).toMatchObject({ backgroundColor: '#564beb' });
    });

    it('should render with secondary variant', () => {
      const { getByTestId } = render(
        <ActionButton
          onPress={() => {}}
          text="Secondary"
          variant="secondary"
        />,
      );
      const style = getByTestId('action-button').props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
      expect(flat).toMatchObject({ backgroundColor: '#3e3e47' });
    });

    it('should render loading state', () => {
      const { getByTestId, queryByText } = render(
        <ActionButton onPress={() => {}} text="Loading" loading={true} />,
      );
      // ActivityIndicator should be present
      expect(() => getByTestId('activity-indicator')).not.toThrow();
      // Text should not be visible
      expect(queryByText('Loading')).toBeNull();
    });

    it('should render image when imageSource is provided', () => {
      const mockImage = { uri: 'test.png' };
      const { getByTestId, queryByText } = render(
        <ActionButton
          onPress={() => {}}
          text="With Image"
          imageSource={mockImage}
        />,
      );
      // Image should be present
      const image = getByTestId('button-image');
      expect(image).toBeTruthy();
      // Text should not be visible when image is present
      expect(queryByText('With Image')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when button is pressed', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ActionButton onPress={mockOnPress} text="Press Me" />,
      );

      fireEvent.press(getByText('Press Me'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when button is disabled', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ActionButton onPress={mockOnPress} text="Disabled" disabled={true} />,
      );

      fireEvent.press(getByText('Disabled'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should handle multiple presses', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <ActionButton onPress={mockOnPress} text="Multi Press" />,
      );

      const button = getByText('Multi Press');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Styling', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20, backgroundColor: 'red' };
      const { getByTestId } = render(
        <ActionButton onPress={() => {}} text="Custom" style={customStyle} />,
      );
      const style = getByTestId('action-button').props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
      expect(flat).toMatchObject(customStyle);
    });

    it('should accept custom textStyle prop', () => {
      const customTextStyle = { fontSize: 20, fontWeight: 'bold' };
      const { getByText } = render(
        <ActionButton
          onPress={() => {}}
          text="Custom Text"
          textStyle={customTextStyle}
        />,
      );

      const text = getByText('Custom Text');
      expect(text.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining(customTextStyle)]),
      );
    });

    it('should accept custom imageStyle prop', () => {
      const mockImage = { uri: 'test.png' };
      const customImageStyle = { width: 50, height: 50 };
      const { getByTestId } = render(
        <ActionButton
          onPress={() => {}}
          imageSource={mockImage}
          imageStyle={customImageStyle}
        />,
      );

      const image = getByTestId('button-image');
      expect(image.props.style).toEqual(customImageStyle);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const { toJSON } = render(<ActionButton onPress={() => {}} text="" />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle both loading and disabled states', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <ActionButton
          onPress={mockOnPress}
          text="Both"
          loading={true}
          disabled={true}
        />,
      );

      // Should show loading indicator
      expect(() => getByTestId('activity-indicator')).not.toThrow();
    });

    it('should prioritize loading state over image', () => {
      const mockImage = { uri: 'test.png' };
      const { getByTestId, queryByTestId } = render(
        <ActionButton
          onPress={() => {}}
          imageSource={mockImage}
          loading={true}
        />,
      );

      // Loading indicator should be present
      expect(() => getByTestId('activity-indicator')).not.toThrow();
      // Image should not be visible
      expect(queryByTestId('button-image')).toBeNull();
    });
  });
});
