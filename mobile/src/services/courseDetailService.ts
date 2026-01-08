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

      return this.processCourseDetail(response.data);
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
      order: section.order || index + 1,
      isCompleted: false, // TODO: Get from user progress
      duration: section.estimated_duration || undefined,
    }));

    // Process reviews
    const processedReviews = (reviews || []).map(review => ({
      rating: review.rating,
      review: review.review,
      reviewerName: review.reviewer_name,
      reviewerAvatar: review.reviewer_avatar,
      createdAt: review.created_at,
    }));

    // Calculate actual rating breakdown from reviews
    const ratingBreakdown = this.calculateRatingBreakdown(processedReviews);

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

  private calculateRatingBreakdown(reviews: Array<{ rating: number }>): Record<number, number> {
    // Initialize counts for each star rating
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    // Count actual ratings from reviews
    reviews.forEach(review => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        counts[rating as keyof typeof counts]++;
      }
    });
    
    // Calculate percentages
    const total = reviews.length;
    if (total === 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }
    
    return {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };
  }

  private formatDuration(hours: number): string {
    if (hours === 0) return "TBD";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours === 1) return "1 hour";
    return `${Math.round(hours)} hours`;
  }
}

export const courseDetailService = new CourseDetailService();