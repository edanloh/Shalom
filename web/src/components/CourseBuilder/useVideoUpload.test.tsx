import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoUpload } from './useVideoUpload';

vi.mock('../../services/storageService', () => ({
  StorageService: {
    uploadThumbnail: vi
      .fn()
      .mockResolvedValue({ url: 'thumb-url', error: null }),
    uploadVideo: vi.fn().mockResolvedValue({ url: 'video-url', error: null }),
  },
}));

describe('useVideoUpload', () => {
  const updateLesson = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__lessonFileCache = new Map();
  });

  it('extracts youtube id correctly', () => {
    const { result } = renderHook(() =>
      useVideoUpload(updateLesson, 'm1', 'l1', {
        videoUrl: '',
        thumbnailUrl: '',
      }),
    );

    expect(result.current.extractYouTubeId('https://youtu.be/abc123')).toBe(
      'abc123',
    );
    expect(result.current.extractYouTubeId('https://example.com')).toBeNull();
  });

  it('sets local marker on thumbnail file change', () => {
    const { result } = renderHook(() =>
      useVideoUpload(updateLesson, 'm1', 'l1', {
        videoUrl: '',
        thumbnailUrl: '',
      }),
    );

    const file = new File(['a'], 'thumb.png', { type: 'image/png' });
    const event = { target: { files: [file], value: '' } } as any;

    act(() => {
      result.current.handleThumbnailFileChange(event);
    });

    expect(updateLesson).toHaveBeenCalledWith('m1', 'l1', {
      thumbnailUrl: '[LOCAL_FILE: thumb.png]',
    });
  });

  it('clearVideo resets lesson video fields', () => {
    const { result } = renderHook(() =>
      useVideoUpload(updateLesson, 'm1', 'l1', {
        videoUrl: '',
        thumbnailUrl: '',
      }),
    );

    act(() => {
      result.current.clearVideo();
    });

    expect(updateLesson).toHaveBeenCalledWith('m1', 'l1', {
      videoUrl: '',
      durationSeconds: 0,
    });
  });
});
