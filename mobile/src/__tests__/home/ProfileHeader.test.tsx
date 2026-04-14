import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileHeader from '../../components/home/ProfileHeader';

const mockUseUser = jest.fn();

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) => (
      <View testID="linear-gradient">{children}</View>
    ),
  };
});

jest.mock('../../contexts/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('../../utils/avatar', () => ({
  getAvatarUri: () => 'https://example.com/avatar.png',
}));

jest.mock('../../components/common', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ImageWithFallback: () => <View testID="profile-image" />,
  };
});

describe('ProfileHeader', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ user: { name: 'Shalom User' } });
  });

  it('renders welcome text and user name', () => {
    const { getByText, getByTestId } = render(
      <ProfileHeader balance={240} equippedTitle={{ icon: '📚', name: 'Scholar' }} />
    );

    expect(getByTestId('linear-gradient')).toBeTruthy();
    expect(getByTestId('profile-image')).toBeTruthy();
    expect(getByText('Welcome Back,')).toBeTruthy();
    expect(getByText('Shalom User')).toBeTruthy();
    expect(getByText('240')).toBeTruthy();
    expect(getByText('📚 Scholar')).toBeTruthy();
  });

  it('falls back to User when name is missing', () => {
    mockUseUser.mockReturnValue({ user: null });
    const { getByText } = render(<ProfileHeader />);

    expect(getByText('User')).toBeTruthy();
  });
});
