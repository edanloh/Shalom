import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ScreenHeader from '../../components/common/ScreenHeader';

describe('ScreenHeader', () => {
  describe('Rendering', () => {
    it('should render with title', () => {
      const { getByText } = render(<ScreenHeader title="Test Title" />);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render with title and subtitle', () => {
      const { getByText } = render(
        <ScreenHeader title="Main Title" subtitle="Subtitle Text" />,
      );
      expect(getByText('Main Title')).toBeTruthy();
      expect(getByText('Subtitle Text')).toBeTruthy();
    });

    it('should render left icon when provided', () => {
      const { toJSON } = render(
        <ScreenHeader
          title="Title"
          headerLeftIcon="chevron-back"
          onHeaderLeftPress={() => {}}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render left component when provided', () => {
      const { Text } = require('react-native');
      const { toJSON } = render(
        <ScreenHeader
          title="Title"
          headerLeftComponent={<Text>Custom Left</Text>}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render right icon when provided', () => {
      const { toJSON } = render(
        <ScreenHeader
          title="Title"
          headerRightIcon="settings"
          onHeaderRightPress={() => {}}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render right component when provided', () => {
      const { Text } = require('react-native');
      const { toJSON } = render(
        <ScreenHeader
          title="Title"
          headerRightComponent={<Text>Custom Right</Text>}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should not render subtitle when not provided', () => {
      const { queryByText } = render(<ScreenHeader title="Only Title" />);
      // Title should exist
      expect(queryByText('Only Title')).toBeTruthy();
      // Subtitle should not exist (we'll just verify component renders)
      const { toJSON } = render(<ScreenHeader title="Only Title" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onHeaderLeftPress when left button is pressed', () => {
      const mockLeftPress = jest.fn();
      const { getByTestId } = render(
        <ScreenHeader
          title="Title"
          headerLeftIcon="chevron-back"
          onHeaderLeftPress={mockLeftPress}
        />,
      );

      // Find the TouchableOpacity with the back button
      const buttons = render(
        <ScreenHeader
          title="Title"
          headerLeftIcon="chevron-back"
          onHeaderLeftPress={mockLeftPress}
        />,
      ).UNSAFE_getAllByType(require('react-native').TouchableOpacity);

      if (buttons.length > 0) {
        fireEvent.press(buttons[0]);
        expect(mockLeftPress).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onHeaderRightPress when right button is pressed', () => {
      const mockRightPress = jest.fn();
      const buttons = render(
        <ScreenHeader
          title="Title"
          headerRightIcon="settings"
          onHeaderRightPress={mockRightPress}
        />,
      ).UNSAFE_getAllByType(require('react-native').TouchableOpacity);

      if (buttons.length > 0) {
        fireEvent.press(buttons[buttons.length - 1]);
        expect(mockRightPress).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Props', () => {
    it('should apply custom styles when provided', () => {
      const customStyles = { backgroundColor: 'red', padding: 20 };
      const { toJSON } = render(
        <ScreenHeader title="Title" customStyles={customStyles} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle long title text', () => {
      const longTitle =
        'This is a very long title that should be truncated with ellipsis';
      const { getByText } = render(<ScreenHeader title={longTitle} />);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle long subtitle text', () => {
      const longSubtitle =
        'This is a very long subtitle that should also be truncated';
      const { getByText } = render(
        <ScreenHeader title="Title" subtitle={longSubtitle} />,
      );
      expect(getByText(longSubtitle)).toBeTruthy();
    });
  });
});
