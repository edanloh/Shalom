/**
 * Native (iOS/Android) YouTube Player Wrapper
 * Uses react-native-youtube-iframe for native playback
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

interface YouTubePlayerWrapperProps {
  videoId: string;
  height: number;
  play: boolean;
  initialPlayerParams?: {
    start?: number;
  };
  onChangeState?: (state: string) => void;
  onProgress?: (data: { currentTime: number; duration: number }) => void;
  onError?: (error: any) => void;
}

export const YouTubePlayerWrapper = React.forwardRef<any, YouTubePlayerWrapperProps>(
  (props, ref) => {
    const { videoId, height, play, initialPlayerParams, onChangeState, onProgress, onError } =
      props;

    const handleProgress = (data: any) => {
      console.log('🎬 YouTube iframe progress event:', data);
      if (onProgress) {
        onProgress({
          currentTime: data.currentTime || 0,
          duration: data.duration || 0,
        });
      }
    };

    return (
      <YoutubePlayer
        ref={ref}
        height={height}
        videoId={videoId}
        play={play}
        onChangeState={onChangeState}
        onProgress={handleProgress}
        onError={onError}
        initialPlayerParams={initialPlayerParams}
      />
    );
  }
);

const styles = StyleSheet.create({
  webFallback: {
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  webFallbackText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 20,
  },
  webFallbackButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  webFallbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
});
