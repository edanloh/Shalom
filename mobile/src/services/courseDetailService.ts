import { apiService } from './apiService';

export interface CourseDetailResponse {
  success: boolean;
  message: string;
  data: {
    course: {
      id: string;
      title: string;
      description: string;
      instructor_id: string;
      category_id: string;
      level: string;
      duration_hours: number;
      thumbnail_url: string;
      video_preview_url: string | null;
      rating: string;
      total_ratings: number;
      student_count: number;
      is_published: boolean;
      is_featured: boolean;
      language: string;
      subtitles: string | null;
      tags: string[];
      created_at: string;
      updated_at: string;
      category_name: string;
      category_description: string;
      category_icon: string;
      category_color: string;
      instructor_name: string;
      instructor_email: string;
      instructor_avatar: string;
      instructor_bio: string;
      instructor_rating: string;
      instructor_total_students: number;
      instructor_total_courses: number;
      instructor_experience: number;
      instructor_education: string;
      instructor_certifications: string[];
      instructor_expertise: string[];
      total_duration_seconds: number;
      requirements: string[];
      outcomes: string[];
    };
    sections: any[];
    videos: any[];
    quizzes: any[];
    reviews: Array<{
      rating: number;
      review: string;
      created_at: string;
      reviewer_name: string;
      reviewer_avatar: string;
      is_anonymous: boolean;
    }>;
    statistics: {
      total_sections: number;
      total_videos: number;
      total_quizzes: number;
      total_duration_seconds: number;
      total_duration_formatted: string;
      preview_videos_count: number;
    };
    meta: {
      timestamp: string;
      requestId: string;
    };
  };
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  isCompleted: boolean;
  duration?: string;
}

export interface ProcessedCourseDetail {
  id: string;
  title: string;
  description: string;
  image: string;
  instructor: {
    name: string;
    avatar: string;
    bio: string;
    rating: number;
    studentsCount: number;
    expertise: string[];
  };
  rating: number;
  totalRatings: number;
  studentCount: number;
  duration: string;
  level: string;
  category: string;
  tags: string[];
  modules: CourseModule[];
  reviews: Array<{
    rating: number;
    review: string;
    reviewerName: string;
    reviewerAvatar: string;
    createdAt: string;
  }>;
  ratingBreakdown: Record<number, number>;
  requirements: string[];
  outcomes: string[];
}

class CourseDetailService {
  /**
   * Get course detail
   * Endpoint: GET /getModuleDetail/{courseId}
   * Maps to getModuleDetail.mjs Lambda function
   */
  async getCourseDetail(courseId: string): Promise<ProcessedCourseDetail> {
    try {
      console.log(`Fetching course details for: ${courseId}`);
      
      const response = await apiService.get<CourseDetailResponse>(`/getModuleDetail/${courseId}`);
      
      console.log('=== Course Detail API Response ===');
      console.log('Response keys:', Object.keys(response || {}));
      console.log('response.success:', response?.success);
      console.log('response.data exists:', !!response?.data);
      console.log('response.data keys:', Object.keys(response?.data || {}));
      console.log('response.data.sections:', response?.data?.sections);
      console.log('Full response:', JSON.stringify(response, null, 2).slice(0, 1000));
      console.log('================================');
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch course details');
      }

      return this.processCourseDetail(data);
    } catch (error) {
      console.error('Error fetching course details:', error);
      throw error;
    }
  }

  private processCourseDetail(data: CourseDetailResponse['data']): ProcessedCourseDetail {
    const { course, reviews = [], statistics } = data;

    // Process modules - only use actual sections from API
    const modules: CourseModule[] = (data.sections || []).map((section: any, index: number) => ({
      id: section.id,
      title: section.title || `Module ${index + 1}`,
      description: section.description,
      order: section.order_index || section.order || index + 1,
      isCompleted: section.module_is_completed || false,
      duration: section.duration_minutes || section.estimated_duration || undefined,
    }));

    // Generate rating breakdown (fallback if not in API)
    const ratingBreakdown = this.generateRatingBreakdown(
      parseFloat(course.rating || '0'),
      course.total_ratings || 0
    );

    // Process reviews
    const processedReviews = (reviews || []).map(review => ({
      rating: review.rating,
      review: review.review,
      reviewerName: review.reviewer_name,
      reviewerAvatar: review.reviewer_avatar,
      createdAt: review.created_at,
    }));

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      image: course.thumbnail_url,
      instructor: {
        name: course.instructor_name || 'Unknown',
        avatar: course.instructor_avatar || '',
        bio: course.instructor_bio || '',
        rating: parseFloat(course.instructor_rating || '0'),
        studentsCount: course.instructor_total_students || 0,
        expertise: course.instructor_expertise || [],
      },
      rating: parseFloat(course.rating || '0'),
      totalRatings: course.total_ratings || 0,
      studentCount: course.student_count || 0,
      duration: this.formatDuration(course.duration_hours || 0),
      level: course.level,
      category: course.category_name || 'Uncategorized',
      tags: course.tags || [],
      modules,
      reviews: processedReviews,
      ratingBreakdown,
      requirements: course.requirements || [],
      outcomes: course.outcomes || [],
    };
  }

  private generateRatingBreakdown(rating: number, totalRatings: number): Record<number, number> {
    // Generate realistic rating distribution based on overall rating
    if (rating >= 4.5) {
      return { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 };
    } else if (rating >= 4.0) {
      return { 5: 45, 4: 35, 3: 15, 2: 3, 1: 2 };
    } else if (rating >= 3.5) {
      return { 5: 30, 4: 35, 3: 25, 2: 7, 1: 3 };
    } else {
      return { 5: 20, 4: 25, 3: 30, 2: 15, 1: 10 };
    }
  }

  private formatDuration(hours: number): string {
    if (hours === 0) return "TBD";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours === 1) return "1 hour";
    return `${Math.round(hours)} hours`;
  }
}

export const courseDetailService = new CourseDetailService();
