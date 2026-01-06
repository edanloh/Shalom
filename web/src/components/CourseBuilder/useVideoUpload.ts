import { useState, useEffect, useRef } from 'react';
import { StorageService } from '../../services/storageService';

// Store files in a module-level Map to persist across component re-renders
const fileCache = new Map<string, { thumbnailFile?: File; videoFile?: File }>();

// Expose fileCache via window for access from CourseBuilderContext
if (typeof window !== 'undefined') {
  (window as any).__lessonFileCache = fileCache;
}

export const useVideoUpload = (updateLesson: any, moduleId: string, lessonId: string, lesson: any) => {
  const [isFetchingDuration, setIsFetchingDuration] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ thumbnail: number; video: number }>({ thumbnail: 0, video: 0 });
  const [thumbnailInputType, setThumbnailInputType] = useState<'url' | 'upload'>('url');
  const [videoInputType, setVideoInputType] = useState<'url' | 'upload'>('url');
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);

  // Restore file states from cache when lesson changes
  useEffect(() => {
    const cacheKey = `${moduleId}-${lessonId}`;
    const cachedFiles = fileCache.get(cacheKey);

    if (cachedFiles?.thumbnailFile) {
      setSelectedThumbnailFile(cachedFiles.thumbnailFile);
      setThumbnailInputType('upload');
    } else if (lesson?.thumbnailUrl && !lesson.thumbnailUrl.startsWith('[LOCAL_FILE:')) {
      // Has uploaded URL, not a local file
      setSelectedThumbnailFile(null);
      setThumbnailInputType('url');
    } else {
      setSelectedThumbnailFile(null);
      setThumbnailInputType('url');
    }

    if (cachedFiles?.videoFile) {
      setSelectedVideoFile(cachedFiles.videoFile);
      setVideoInputType('upload');
    } else if (lesson?.videoUrl && !lesson.videoUrl.startsWith('[LOCAL_FILE:')) {
      // Has uploaded URL, not a local file
      setSelectedVideoFile(null);
      setVideoInputType('url');
    } else {
      setSelectedVideoFile(null);
      setVideoInputType('url');
    }
  }, [lessonId, moduleId, lesson]);

  // Function to extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Function to fetch video duration using YouTube IFrame Player API
  const fetchYouTubeDuration = async (videoUrl: string) => {
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      console.log('Could not extract YouTube video ID');
      return;
    }

    setIsFetchingDuration(true);

    try {
      // Load YouTube IFrame API if not already loaded
      if (!(window as any).YT) {
        await new Promise<void>((resolve) => {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
          
          (window as any).onYouTubeIframeAPIReady = () => resolve();
        });
      }

      // Create a hidden div for the player
      const playerDiv = document.createElement('div');
      playerDiv.id = `temp-player-${Date.now()}`;
      playerDiv.style.display = 'none';
      document.body.appendChild(playerDiv);

      // Create player and get duration
      const player = new (window as any).YT.Player(playerDiv.id, {
        height: '1',
        width: '1',
        videoId: videoId,
        events: {
          onReady: (event: any) => {
            const duration = Math.round(event.target.getDuration());
            if (duration > 0) {
              updateLesson(moduleId, lessonId, { 
                durationSeconds: duration 
              });
              console.log(`Auto-fetched duration: ${duration} seconds`);
            }
            // Clean up
            event.target.destroy();
            document.body.removeChild(playerDiv);
            setIsFetchingDuration(false);
          },
          onError: () => {
            console.error('Error loading YouTube video');
            document.body.removeChild(playerDiv);
            setIsFetchingDuration(false);
          }
        }
      });
    } catch (error) {
      console.error('Error fetching YouTube duration:', error);
      setIsFetchingDuration(false);
    }
  };

  // Handle video URL change with auto-fetch attempt
  const handleVideoUrlChange = (url: string) => {
    updateLesson(moduleId, lessonId, { videoUrl: url });
    
    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      setTimeout(() => {
        fetchYouTubeDuration(url);
      }, 100);
    }
  };

  // Handle thumbnail file selection (preview only, no upload yet)
  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnailFile(file);
      
      // Store file in cache for persistence across lesson switches
      const cacheKey = `${moduleId}-${lessonId}`;
      const existingCache = fileCache.get(cacheKey) || {};
      fileCache.set(cacheKey, { ...existingCache, thumbnailFile: file });
      
      // Store with local file marker - will be uploaded on save
      updateLesson(moduleId, lessonId, { 
        thumbnailUrl: `[LOCAL_FILE: ${file.name}]`
      });
    }
  };

  // Handle video file selection (preview only, no upload yet)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideoFile(file);
      
      // Store file in cache for persistence across lesson switches
      const cacheKey = `${moduleId}-${lessonId}`;
      const existingCache = fileCache.get(cacheKey) || {};
      fileCache.set(cacheKey, { ...existingCache, videoFile: file });
      
      // Get video duration from the file
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        if (duration > 0) {
          updateLesson(moduleId, lessonId, { durationSeconds: duration });
          console.log(`Auto-fetched duration from file: ${duration} seconds`);
        }
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);

      // Store with local file marker - will be uploaded on save
      updateLesson(moduleId, lessonId, { 
        videoUrl: `[LOCAL_FILE: ${file.name}]`
      });
    }
  };

  // Function to upload pending files to Supabase (called when save/publish is clicked)
  const uploadPendingFiles = async (thumbnailFile: File | null, videoFile: File | null) => {
    setIsUploading(true);
    const results = { thumbnailUrl: '', videoUrl: '', errors: [] as string[] };

    try {
      // Upload thumbnail if exists
      if (thumbnailFile) {
        setUploadProgress(prev => ({ ...prev, thumbnail: 0 }));
        const { url, error } = await StorageService.uploadThumbnail(thumbnailFile);
        
        if (error) {
          results.errors.push(`Thumbnail upload failed: ${error}`);
        } else {
          results.thumbnailUrl = url;
          setUploadProgress(prev => ({ ...prev, thumbnail: 100 }));
        }
      }

      // Upload video if exists
      if (videoFile) {
        setUploadProgress(prev => ({ ...prev, video: 0 }));
        const { url, error } = await StorageService.uploadVideo(videoFile);
        
        if (error) {
          results.errors.push(`Video upload failed: ${error}`);
        } else {
          results.videoUrl = url;
          setUploadProgress(prev => ({ ...prev, video: 100 }));
        }
      }
    } catch (err: any) {
      results.errors.push(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }

    return results;
  };

  // Clear thumbnail file and cache
  const clearThumbnail = () => {
    setSelectedThumbnailFile(null);
    const cacheKey = `${moduleId}-${lessonId}`;
    const existingCache = fileCache.get(cacheKey) || {};
    delete existingCache.thumbnailFile;
    if (Object.keys(existingCache).length > 0) {
      fileCache.set(cacheKey, existingCache);
    } else {
      fileCache.delete(cacheKey);
    }
    updateLesson(moduleId, lessonId, { thumbnailUrl: '' });
  };

  // Clear video file and cache
  const clearVideo = () => {
    setSelectedVideoFile(null);
    const cacheKey = `${moduleId}-${lessonId}`;
    const existingCache = fileCache.get(cacheKey) || {};
    delete existingCache.videoFile;
    if (Object.keys(existingCache).length > 0) {
      fileCache.set(cacheKey, existingCache);
    } else {
      fileCache.delete(cacheKey);
    }
    updateLesson(moduleId, lessonId, { videoUrl: '', durationSeconds: 0 });
  };

  return {
    isFetchingDuration,
    isUploading,
    uploadProgress,
    thumbnailInputType,
    setThumbnailInputType,
    videoInputType,
    setVideoInputType,
    selectedThumbnailFile,
    selectedVideoFile,
    uploadPendingFiles,
    extractYouTubeId,
    handleVideoUrlChange,
    handleThumbnailFileChange,
    handleVideoFileChange,
    clearThumbnail,
    clearVideo,
  };
};
