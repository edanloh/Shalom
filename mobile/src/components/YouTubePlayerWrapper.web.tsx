/**
 * Web-specific YouTube Player Wrapper
 * Shows fallback UI with link to open in browser
 */

import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';

interface YouTubePlayerWrapperProps {
  videoId: string;
  height: number;
  play: boolean;
  initialPlayerParams?: {
    start?: number;
  };
  onChangeState?: (state: string) => void;
  onProgress?: (data: { currentTime: number; duration: number }) => void;
}

export const YouTubePlayerWrapper = React.forwardRef<any, YouTubePlayerWrapperProps>(
  (props, ref) => {
    const { videoId, height } = props;

    return (
      <View style={[styles.webFallback, { height }]}>
        <Text style={styles.webFallbackTitle}>YouTube Player</Text>
        <Text style={styles.webFallbackText}>
          YouTube videos are only supported on mobile apps.
        </Text>
        <TouchableOpacity
          style={styles.webFallbackButton}
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}
        >
          <Text style={styles.webFallbackButtonText}>Open in YouTube</Text>
        </TouchableOpacity>
      </View>
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
});
