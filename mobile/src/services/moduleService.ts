/**
 * Module Service - Handles course module/content API calls
 * Integrates with AWS Lambda backend for course module details
 */

import { apiService } from './apiService';

// Module Item (Video or Quiz)
export interface ModuleItem {
  id: string;
  type: 'video' | 'quiz';
  title: string;
  description?: string;
  order_index: number;
  is_completed?: boolean;
  // Video specific fields
  video_url?: string;
  duration_seconds?: number;
  thumbnail_url?: string;
  is_preview?: boolean;
  // Quiz specific fields
  passing_score?: number;
  time_limit_minutes?: number;
  max_attempts?: number;
}

// Course Section with Items
export interface CourseSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  lessons_count: number;
  duration_minutes: number;
  items: ModuleItem[];
  itemCount: number;
  module_is_completed?: boolean;
  module_completed_at?: string | null;
}

// User Progress Data
export interface UserProgress {
  progress_percentage: number;
  is_completed: boolean;
  current_video_id?: string;
  total_watch_time_minutes: number;
  enrollment_date?: string;
  completion_date?: string;
  videoProgress: Array<{
    video_id: string;
    watch_time_seconds: number;
    is_completed: boolean;
    last_position_seconds: number;
    completed_at?: string;
  }>;
  quizAttempts: Array<{
    quiz_id: string;
    score: number;
    is_passed: boolean;
    attempt_number: number;
    completed_at: string;
  }>;
}

// Module Detail Response from getModuleDetail Lambda
export interface ModuleDetailResponse {
  success: boolean;
  message: string;
  data: {
    course: {
      id: string;
      title: string;
      description: string;
      instructor_name: string;
      level: string;
      duration_hours: number;
      thumbnail_url?: string;
      video_preview_url?: string;
      rating: string;
      total_ratings: number;
      student_count: number;
      is_published: boolean;
      is_featured: boolean;
      language: string;
      subtitles?: string;
      tags: string[];
      created_at: string;
      updated_at: string;
      category_name: string;
      category_id: string;
      requirements: string[];
      outcomes: string[];
    };
    sections: CourseSection[];
    totalSections: number;
    totalVideos: number;
    totalQuizzes: number;
    userProgress?: UserProgress;
    meta: {
      timestamp: string;
      requestId: string;
      userId: string | null;
    };
  };
}

class ModuleService {
  /**
   * Get course module content with sections, videos, quizzes, and user progress
   * Endpoint: GET /courses/{courseId}/module?userId={userId}
   */
  async getModuleDetail(courseId: string, userId?: string): Promise<ModuleDetailResponse['data']> {
    try {      
      const params: Record<string, string> = {};
      if (userId) {
        params.userId = userId;
      }

      const response = await apiService.get<ModuleDetailResponse>(
        `/courses/${courseId}/module`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch module details');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching module details:', error);
      throw error;
    }
  }

  /**
   * Get specific section by ID
   */
  getSectionById(sections: CourseSection[], sectionId: string): CourseSection | null {
    return sections.find(section => section.id === sectionId) || null;
  }

  /**
   * Get item progress (video or quiz)
   */
  getItemProgress(
    itemId: string,
    itemType: 'video' | 'quiz',
    userProgress?: UserProgress
  ): any {
    if (!userProgress) return null;

    if (itemType === 'video') {
      return userProgress.videoProgress?.find(vp => vp.video_id === itemId);
    } else if (itemType === 'quiz') {
      return userProgress.quizAttempts?.find(qa => qa.quiz_id === itemId);
    }

    return null;
  }

  /**
   * Check if item is completed
   */
  isItemCompleted(item: ModuleItem, userProgress?: UserProgress): boolean {
    if (!userProgress) return false;

    if (item.type === 'video') {
      const progress = userProgress.videoProgress?.find(vp => vp.video_id === item.id);
      return progress?.is_completed || false;
    } else if (item.type === 'quiz') {
      const attempt = userProgress.quizAttempts?.find(qa => qa.quiz_id === item.id);
      return attempt?.is_passed || false;
    }

    return false;
  }

  /**
   * Calculate section completion percentage
   */
  getSectionCompletionPercentage(section: CourseSection, userProgress?: UserProgress): number {
    if (!userProgress || section.items.length === 0) return 0;

    const completedItems = section.items.filter(item => 
      this.isItemCompleted(item, userProgress)
    ).length;

    return Math.round((completedItems / section.items.length) * 100);
  }

  /**
   * Format duration from seconds to readable string
   */
  formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get total course duration in formatted string
   */
  getTotalDuration(sections: CourseSection[]): string {
    const totalMinutes = sections.reduce((sum, section) => sum + section.duration_minutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Count total items (videos + quizzes) in course
   */
  getTotalItems(sections: CourseSection[]): number {
    return sections.reduce((sum, section) => sum + section.items.length, 0);
  }

  /**
   * Get next incomplete item in course
   */
  getNextIncompleteItem(sections: CourseSection[], userProgress?: UserProgress): ModuleItem | null {
    for (const section of sections) {
      for (const item of section.items) {
        if (!this.isItemCompleted(item, userProgress)) {
          return item;
        }
      }
    }
    return null;
  }

  /**
   * Get course completion stats
   */
  getCompletionStats(sections: CourseSection[], userProgress?: UserProgress): {
    completedItems: number;
    totalItems: number;
    percentage: number;
  } {
    const totalItems = this.getTotalItems(sections);
    let completedItems = 0;

    if (userProgress) {
      for (const section of sections) {
        for (const item of section.items) {
          if (this.isItemCompleted(item, userProgress)) {
            completedItems++;
          }
        }
      }
    }

    return {
      completedItems,
      totalItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  }
}

// Export singleton instance
export const moduleService = new ModuleService();
export default moduleService;
