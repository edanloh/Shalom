import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { YouTubePlayerWrapper } from '../components/YouTubePlayerWrapper.web';

describe('YouTubePlayerWrapper (web fallback)', () => {
  it('renders fallback UI text', () => {
    const { getByText } = render(
      <YouTubePlayerWrapper videoId="abc123" height={260} play={false} />,
    );

    expect(getByText('YouTube Player')).toBeTruthy();
    expect(
      getByText('YouTube videos are only supported on mobile apps.'),
    ).toBeTruthy();
    expect(getByText('Open in YouTube')).toBeTruthy();
  });

  it('opens the youtube URL when pressing button', () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(true as any);

    const { getByText } = render(
      <YouTubePlayerWrapper videoId="abc123" height={260} play={false} />,
    );

    fireEvent.press(getByText('Open in YouTube'));
    expect(openURLSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc123',
    );

    openURLSpy.mockRestore();
  });

  it('applies passed height to container style', () => {
    const { UNSAFE_getByType } = render(
      <YouTubePlayerWrapper videoId="abc123" height={321} play={false} />,
    );

    const { View } = require('react-native');
    const container = UNSAFE_getByType(View);
    expect(container.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 321 })]),
    );
  });
});
