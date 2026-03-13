import React from 'react';
import { render } from '@testing-library/react-native';
import { YouTubePlayerWrapper } from '../components/YouTubePlayerWrapper';

jest.mock('react-native-youtube-iframe', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, _ref: any) => (
    <View testID="youtube-player" {...props} />
  ));
});

describe('YouTubePlayerWrapper (native)', () => {
  it('renders youtube iframe wrapper with expected props', () => {
    const { getByTestId } = render(
      <YouTubePlayerWrapper videoId="abc123" height={240} play={true} />,
    );

    const player = getByTestId('youtube-player');
    expect(player).toBeTruthy();
    expect(player.props.videoId).toBe('abc123');
    expect(player.props.height).toBe(240);
    expect(player.props.play).toBe(true);
  });

  it('maps progress callback payload shape', () => {
    const onProgress = jest.fn();
    const { getByTestId } = render(
      <YouTubePlayerWrapper
        videoId="abc123"
        height={240}
        play={false}
        onProgress={onProgress}
      />,
    );

    const player = getByTestId('youtube-player');
    player.props.onProgress({ currentTime: 12.3, duration: 99 });

    expect(onProgress).toHaveBeenCalledWith({
      currentTime: 12.3,
      duration: 99,
    });
  });

  it('passes onChangeState and onError handlers through', () => {
    const onChangeState = jest.fn();
    const onError = jest.fn();

    const { getByTestId } = render(
      <YouTubePlayerWrapper
        videoId="abc123"
        height={240}
        play={false}
        onChangeState={onChangeState}
        onError={onError}
      />,
    );

    const player = getByTestId('youtube-player');
    player.props.onChangeState('playing');
    player.props.onError({ code: 'E_FAIL' });

    expect(onChangeState).toHaveBeenCalledWith('playing');
    expect(onError).toHaveBeenCalledWith({ code: 'E_FAIL' });
  });
});
