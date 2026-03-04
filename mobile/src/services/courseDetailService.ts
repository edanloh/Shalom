import { Colors } from '@/constants/Colors';
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
      duration_hours: number;
      thumbnail_url: string;
      rating: string | number;
      total_ratings?: number;
      totalRatings?: number;
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
      ratingBreakdown?: Record<number, number>;
      reviews?: Array<{
        rating: number;
        review: string;
        created_at?: string;
        createdAt?: string;
        reviewer_name?: string;
        reviewerName?: string;
        reviewer_avatar?: string | null;
        reviewerAvatar?: string | null;
        is_anonymous?: boolean;
        instructor_reply?: string | null;
        instructorReply?: string | null;
        instructor_replied_at?: string | null;
        instructorRepliedAt?: string | null;
        acknowledged_at?: string | null;
        acknowledgedAt?: string | null;
        is_pinned?: boolean;
        isPinned?: boolean;
      }>;
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
  category: string;
  categoryColor: string;
  tags: string[];
  modules: CourseModule[];
  reviews: Array<{
    rating: number;
    review: string;
    reviewerName: string;
    reviewerAvatar: string;
    createdAt: string;
    instructorReply?: string | null;
    instructorRepliedAt?: string | null;
    acknowledgedAt?: string | null;
    isPinned?: boolean;
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
      
      if (!response?.success || !response?.data) {
        throw new Error('Failed to fetch course details');
      }

      return this.processCourseDetail(response.data);
    } catch (error) {
      console.error('Error fetching course details:', error);
      throw error;
    }
  }

  private processCourseDetail(data: CourseDetailResponse['data']): ProcessedCourseDetail {
    const { course } = data;
    const reviewsSource =
      (data as any)?.reviews ??
      (course as any)?.reviews ??
      [];

    // Process modules - only use actual sections from API
    const modules: CourseModule[] = (data.sections || []).map((section: any, index: number) => ({
      id: section.id,
      title: section.title || `Module ${index + 1}`,
      description: section.description,
      order: section.order_index || section.order || index + 1,
      isCompleted: section.module_is_completed || false,
      duration: section.duration_minutes || section.estimated_duration || undefined,
    }));

    // Process reviews
    const processedReviews = (reviewsSource || []).map((review: any) => ({
      rating: review.rating,
      review: review.review,
      reviewerName: review.reviewer_name ?? review.reviewerName ?? "Anonymous",
      reviewerAvatar: review.reviewer_avatar ?? review.reviewerAvatar ?? null,
      createdAt: review.created_at ?? review.createdAt ?? new Date().toISOString(),
      instructorReply: review.instructor_reply ?? review.instructorReply ?? null,
      instructorRepliedAt:
        review.instructor_replied_at ?? review.instructorRepliedAt ?? null,
      acknowledgedAt: review.acknowledged_at ?? review.acknowledgedAt ?? null,
      isPinned: Boolean(review.is_pinned ?? review.isPinned),
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
      rating: parseFloat(String(course.rating || 0)),
      totalRatings: Number(
        ((course as any).total_ratings ?? (course as any).totalRatings ?? processedReviews.length) || 0
      ),
      studentCount: course.student_count || 0,
      duration: this.formatDuration(course.duration_hours || 0),
      category: course.category_name || 'Uncategorized',
      categoryColor: course.category_color || Colors.accent,
      tags: course.tags || [],
      modules,
      reviews: processedReviews,
      ratingBreakdown: (course as any).ratingBreakdown ?? ratingBreakdown,
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
