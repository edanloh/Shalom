/**
 * Video Service - Handles all video-related API calls
 * Integrates with AWS Lambda backend for video playback and progress tracking
 */

import { apiService } from './apiService';

// Video Detail Response from getVideoDetail Lambda
export interface VideoDetailResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    description: string;
    video_url: string;
    duration_seconds: number;
    thumbnail_url?: string;
    is_preview: boolean;
    course: {
      id: string;
      title: string;
    };
    section: {
      id: string;
      title: string;
    };
    navigation: {
      previousVideo: { id: string; title: string } | null;
      nextVideo: { id: string; title: string } | null;
    };
    userProgress?: {
      watch_time_seconds: number;
      is_completed: boolean;
      last_position_seconds: number;
      completed_at?: string;
      updated_at?: string;
    };
  };
}

// Update Progress Request Body
export interface UpdateVideoProgressRequest {
  userId: string;
  videoId: string;
  watchTimeSeconds: number;
  isCompleted: boolean;
  lastPositionSeconds: number;
}

// Update Progress Response from updateVideoProgress Lambda
export interface UpdateVideoProgressResponse {
  success: boolean;
  message: string;
  data: {
    videoProgress: {
      user_id: string;
      video_id: string;
      watch_time_seconds: number;
      is_completed: boolean;
      last_position_seconds: number;
      completed_at?: string;
      updated_at: string;
    };
    courseProgress: {
      progress_percentage: string;
      is_completed: boolean;
      completed_items: number;
      total_items: number;
    };
  };
}

class VideoService {
  /**
   * Get video details with navigation and user progress
   * Endpoint: GET /getVideoDetail/{videoId}?userId={userId}&courseId={courseId}
   * Maps to getVideoDetail.mjs Lambda function
   */
  async getVideoDetail(courseId: string, videoId: string, userId?: string): Promise<VideoDetailResponse['data']> {
    try {      
      const params: Record<string, string> = {
        courseId: courseId,
      };
      if (userId) {
        params.userId = userId;
      }

      const response = await apiService.get<VideoDetailResponse>(
        `/getVideoDetail/${videoId}`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch video details');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }

  /**
   * Update video watch progress
   * Endpoint: POST /updateVideoProgress
   * Maps to updateVideoProgress.mjs Lambda function
   * 
   * This should be called:
   * - Every 10 seconds during playback
   * - When video ends
   * - When user navigates away
   */
  async updateProgress(courseId: string, request: UpdateVideoProgressRequest): Promise<UpdateVideoProgressResponse['data']> {
    try {
      const endpoint = `/updateVideoProgress`;
      console.log('🔵 API Call: POST', endpoint);
      console.log('📦 Request payload:', {
        courseId,
        videoId: request.videoId,
        userId: request.userId,
        watchTime: request.watchTimeSeconds,
        isCompleted: request.isCompleted,
        lastPosition: request.lastPositionSeconds,
      });

      const response = await apiService.post<UpdateVideoProgressResponse>(
        endpoint,
        { ...request, courseId } // Include courseId in the body
      );

      console.log('🟢 API Response received:', {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
      });

      if (!response.success || !response.data) {
        console.error('❌ API returned unsuccessful response:', response);
        throw new Error(response.message || 'Failed to update video progress');
      }

      console.log('✅ Video progress updated successfully');
      return response.data;
    } catch (error) {
      // Don't throw error for progress updates - just log it
      // This prevents disrupting video playback if progress save fails
      console.warn('⚠️ Error updating video progress (non-critical):', error);
      console.warn('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Return a fallback response
      console.log('🔄 Returning fallback response');
      return {
        videoProgress: {
          user_id: request.userId,
          video_id: request.videoId,
          watch_time_seconds: request.watchTimeSeconds,
          is_completed: request.isCompleted,
          last_position_seconds: request.lastPositionSeconds,
          updated_at: new Date().toISOString(),
        },
        courseProgress: {
          progress_percentage: '0',
          is_completed: false,
          completed_items: 0,
          total_items: 0,
        },
      };
    }
  }

  /**
   * Format seconds to MM:SS or HH:MM:SS format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate completion percentage based on watch time
   */
  calculateCompletionPercentage(watchedSeconds: number, totalSeconds: number): number {
    if (totalSeconds === 0) return 0;
    return Math.min(100, Math.round((watchedSeconds / totalSeconds) * 100));
  }

  /**
   * Check if video should be marked as completed (90% watched)
   */
  isVideoCompleted(currentPosition: number, duration: number): boolean {
    if (duration === 0) return false;
    return currentPosition >= duration * 0.9;
  }
}

// Export singleton instance
export const videoService = new VideoService();
export default videoService;
