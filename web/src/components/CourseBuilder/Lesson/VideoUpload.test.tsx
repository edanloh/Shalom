import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VideoUpload } from './VideoUpload';

describe('VideoUpload', () => {
  const updateLesson = vi.fn();
  const setVideoInputType = vi.fn();
  const handleVideoUrlChange = vi.fn();
  const handleVideoFileChange = vi.fn();
  const clearVideo = vi.fn();
  const setLocalVideoPreviewUrl = vi.fn();
  const extractYouTubeId = vi.fn(() => null);
  const setValidationMessage = vi.fn();
  const setShowValidationModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__lessonFileCache = new Map();
  });

  it('renders required warning when validation fails', () => {
    render(
      <VideoUpload
        module={{ id: 'm1' }}
        lesson={{ id: 'l1', videoUrl: '' }}
        updateLesson={updateLesson}
        showValidationErrors
        hasVideo={false}
        videoInputType="url"
        setVideoInputType={setVideoInputType}
        handleVideoUrlChange={handleVideoUrlChange}
        handleVideoFileChange={handleVideoFileChange}
        clearVideo={clearVideo}
        selectedVideoFile={null}
        localVideoPreviewUrl=""
        setLocalVideoPreviewUrl={setLocalVideoPreviewUrl}
        isUploading={false}
        extractYouTubeId={extractYouTubeId}
        setValidationMessage={setValidationMessage}
        setShowValidationModal={setShowValidationModal}
      />,
    );

    expect(
      screen.getByText('Video URL or file is required.'),
    ).toBeInTheDocument();
  });

  it('switches to upload mode', () => {
    render(
      <VideoUpload
        module={{ id: 'm1' }}
        lesson={{ id: 'l1', videoUrl: '' }}
        updateLesson={updateLesson}
        showValidationErrors={false}
        hasVideo
        videoInputType="url"
        setVideoInputType={setVideoInputType}
        handleVideoUrlChange={handleVideoUrlChange}
        handleVideoFileChange={handleVideoFileChange}
        clearVideo={clearVideo}
        selectedVideoFile={null}
        localVideoPreviewUrl=""
        setLocalVideoPreviewUrl={setLocalVideoPreviewUrl}
        isUploading={false}
        extractYouTubeId={extractYouTubeId}
        setValidationMessage={setValidationMessage}
        setShowValidationModal={setShowValidationModal}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }));

    expect(setVideoInputType).toHaveBeenCalledWith('upload');
  });

  it('calls url change handler when typing URL', () => {
    render(
      <VideoUpload
        module={{ id: 'm1' }}
        lesson={{ id: 'l1', videoUrl: '' }}
        updateLesson={updateLesson}
        showValidationErrors={false}
        hasVideo
        videoInputType="url"
        setVideoInputType={setVideoInputType}
        handleVideoUrlChange={handleVideoUrlChange}
        handleVideoFileChange={handleVideoFileChange}
        clearVideo={clearVideo}
        selectedVideoFile={null}
        localVideoPreviewUrl=""
        setLocalVideoPreviewUrl={setLocalVideoPreviewUrl}
        isUploading={false}
        extractYouTubeId={extractYouTubeId}
        setValidationMessage={setValidationMessage}
        setShowValidationModal={setShowValidationModal}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        'https://youtube.com/watch?v=... or any video URL',
      ),
      {
        target: { value: 'https://example.com/video.mp4' },
      },
    );

    expect(handleVideoUrlChange).toHaveBeenCalledWith(
      'https://example.com/video.mp4',
    );
  });
});
