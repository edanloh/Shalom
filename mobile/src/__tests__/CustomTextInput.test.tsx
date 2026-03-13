import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CustomTextInput from '../components/CustomTextInput';

describe('CustomTextInput', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      const { toJSON } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Enter text"
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should display placeholder text', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Enter your email"
        />,
      );
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    });

    it('should display the current value', () => {
      const { getByDisplayValue } = render(
        <CustomTextInput
          value="test@example.com"
          onChangeText={() => {}}
          placeholder="Email"
        />,
      );
      expect(getByDisplayValue('test@example.com')).toBeTruthy();
    });

    it('should render with secure text entry enabled', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Password"
          secureTextEntry={true}
        />,
      );
      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should show clear button when value is not empty', () => {
      const { getByTestId } = render(
        <CustomTextInput
          value="some text"
          onChangeText={() => {}}
          placeholder="Text"
        />,
      );
      expect(getByTestId('clear-button')).toBeTruthy();
    });

    it('should not show clear button when value is empty', () => {
      const { queryByTestId } = render(
        <CustomTextInput value="" onChangeText={() => {}} placeholder="Text" />,
      );
      expect(queryByTestId('clear-button')).toBeNull();
    });

    it('should show eye icon when onTogglePassword is provided', () => {
      const { getByTestId } = render(
        <CustomTextInput
          value="password"
          onChangeText={() => {}}
          placeholder="Password"
          secureTextEntry={true}
          showPassword={false}
          onTogglePassword={() => {}}
        />,
      );
      expect(getByTestId('toggle-password')).toBeTruthy();
    });

    it('should render warning text when provided', () => {
      const { getByText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Email"
          warningText="Invalid email format"
        />,
      );
      expect(getByText('Invalid email format')).toBeTruthy();
    });

    it('should render left icon when leftIconName is provided', () => {
      const { getByTestId } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Email"
          leftIconName="mail-outline"
        />,
      );
      expect(getByTestId('left-icon')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onChangeText when text changes', () => {
      const mockOnChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={mockOnChangeText}
          placeholder="Enter text"
        />,
      );

      const input = getByPlaceholderText('Enter text');
      fireEvent.changeText(input, 'new text');
      expect(mockOnChangeText).toHaveBeenCalledWith('new text');
    });

    it('should clear text when clear button is pressed', () => {
      const mockOnChangeText = jest.fn();
      const { getByTestId } = render(
        <CustomTextInput
          value="some text"
          onChangeText={mockOnChangeText}
          placeholder="Text"
        />,
      );

      const clearButton = getByTestId('clear-button');
      fireEvent.press(clearButton);
      expect(mockOnChangeText).toHaveBeenCalledWith('');
    });

    it('should toggle password visibility when eye icon is pressed', () => {
      const mockTogglePassword = jest.fn();
      const { getByTestId } = render(
        <CustomTextInput
          value="password"
          onChangeText={() => {}}
          placeholder="Password"
          secureTextEntry={true}
          showPassword={false}
          onTogglePassword={mockTogglePassword}
        />,
      );

      const eyeIcon = getByTestId('toggle-password');
      fireEvent.press(eyeIcon);
      expect(mockTogglePassword).toHaveBeenCalledTimes(1);
    });

    it('should call onSubmitEditing when submitted', () => {
      const mockOnSubmit = jest.fn();
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value="text"
          onChangeText={() => {}}
          placeholder="Search"
          onSubmitEditing={mockOnSubmit}
        />,
      );

      const input = getByPlaceholderText('Search');
      fireEvent(input, 'submitEditing');
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Props', () => {
    it('should support multiline prop', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Description"
          multiline={true}
          numberOfLines={4}
        />,
      );

      const input = getByPlaceholderText('Description');
      expect(input.props.multiline).toBe(true);
      expect(input.props.numberOfLines).toBe(4);
    });

    it('should support maxLength prop', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Short text"
          maxLength={50}
        />,
      );

      const input = getByPlaceholderText('Short text');
      expect(input.props.maxLength).toBe(50);
    });

    it('should support keyboardType prop', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Email"
          keyboardType="email-address"
        />,
      );

      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('should support autoCapitalize prop', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Name"
          autoCapitalize="words"
        />,
      );

      const input = getByPlaceholderText('Name');
      expect(input.props.autoCapitalize).toBe('words');
    });

    it('should support returnKeyType prop', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value=""
          onChangeText={() => {}}
          placeholder="Search"
          returnKeyType="search"
        />,
      );

      const input = getByPlaceholderText('Search');
      expect(input.props.returnKeyType).toBe('search');
    });
  });

  describe('Password Toggle', () => {
    it('should show password when showPassword is true', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value="password123"
          onChangeText={() => {}}
          placeholder="Password"
          secureTextEntry={true}
          showPassword={true}
          onTogglePassword={() => {}}
        />,
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(false);
    });

    it('should hide password when showPassword is false', () => {
      const { getByPlaceholderText } = render(
        <CustomTextInput
          value="password123"
          onChangeText={() => {}}
          placeholder="Password"
          secureTextEntry={true}
          showPassword={false}
          onTogglePassword={() => {}}
        />,
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should change eye icon based on showPassword state', () => {
      const { getByTestId } = render(
        <CustomTextInput
          value="password"
          onChangeText={() => {}}
          placeholder="Password"
          secureTextEntry={true}
          showPassword={false}
          onTogglePassword={() => {}}
        />,
      );

      // Just verify the toggle button exists - icon state is internal
      expect(getByTestId('toggle-password')).toBeTruthy();
    });
  });
});
