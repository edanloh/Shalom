/**
 * Lesson Service - Handles lesson/video/PDF related API calls
 */

import apiService from './apiService';

export interface LessonDetail {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'pdf';
  video_url?: string;
  resource_url?: string;
  file_size_bytes?: number;
  is_downloadable?: boolean;
  duration_seconds?: number;
  thumbnail_url?: string;
  is_preview: boolean;
  order_index: number;
  course: {
    id: string;
    title: string;
    instructor_name: string;
  };
  section: {
    id: string;
    title: string;
  };
  sectionVideos: Array<{
    id: string;
    title: string;
    order_index: number;
    type: 'video' | 'pdf';
  }>;
  navigation: {
    previousVideo: {
      id: string;
      title: string;
      type: 'video' | 'pdf';
    } | null;
    nextVideo: {
      id: string;
      title: string;
      type: 'video' | 'pdf';
    } | null;
  };
  userProgress?: {
    progress_percentage: number;
    watch_time_seconds: number;
    is_completed: boolean;
    last_position_seconds: number;
    completed_at?: string;
    updated_at: string;
  };
}

class LessonService {
  /**
   * Get lesson details (video or PDF) with navigation and progress
   * @param lessonId - The lesson ID (can be video or PDF resource)
   * @param userId - The user ID for progress tracking (optional)
   */
  async getLessonDetail(lessonId: string, userId?: string): Promise<LessonDetail> {
    try {
      // Build URL with optional userId parameter
      const params = userId ? `?userId=${userId}` : '';
      const response = await apiService.get<{ data: LessonDetail }>(`/getLessonDetail/${lessonId}${params}`);
      
      if (!response || !response.data) {
        throw new Error('Lesson not found');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching lesson detail:', error);
      throw error;
    }
  }
}

export const lessonService = new LessonService();
export default lessonService;
