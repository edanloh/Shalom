/**
 * PDF Service - Handles all PDF-related API calls
 * Integrates with Supabase backend for PDF access and progress tracking
 */
/**
 * PDF Service - UPDATED to properly handle completion and cache invalidation
 */

import { apiService } from "./apiService";

export interface PDFDetailResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    description: string;
    pdf_url: string;
    thumbnail_url?: string;
    course: {
      id: string;
      title: string;
    };
    section: {
      id: string;
      title: string;
    };
    navigation: {
      previousItem: { id: string; title: string; type: 'video' | 'pdf' | 'quiz' } | null;
      nextItem: { id: string; title: string; type: 'video' | 'pdf' | 'quiz' } | null;
    };
    userProgress?: {
      is_completed: boolean;
      completed_at?: string;
      updated_at?: string;
    };
  };
}

export interface MarkPDFCompletedRequest {
  userId: string;
  pdfId: string;
  isCompleted: boolean;
}

export interface MarkPDFCompletedResponse {
  success: boolean;
  message: string;
  data: {
    pdfProgress: {
      user_id: string;
      resource_id: string;
      is_completed: boolean;
      completed_at?: string;
      updated_at: string;
    };
    courseProgress: {
      progress_percentage: string;
      is_completed: boolean;
      completed_items: number;
      total_items: number;
      completed_videos: number;
      total_videos: number;
      passed_quizzes: number;
      total_quizzes: number;
      completed_pdfs: number;
      total_pdfs: number;
    };
    moduleProgress?: {
      section_id: string;
      is_completed: boolean;
      completed_videos: number;
      total_videos: number;
      passed_quizzes: number;
      total_quizzes: number;
      completed_pdfs: number;
      total_pdfs: number;
    };
  };
}

class PDFService {
  /**
   * Get PDF details with navigation and user progress
   * Endpoint: GET /courses/{courseId}/module/pdfs/{pdfId}?userId={userId}
   */
  async getPDFDetail(
    courseId: string,
    pdfId: string,
    userId?: string
  ): Promise<PDFDetailResponse["data"]> {
    try {
      const params: Record<string, string> = {};
      if (userId) {
        params.userId = userId;
      }

      const response = await apiService.get<PDFDetailResponse>(
        `/courses/${courseId}/module/pdfs/${pdfId}`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch PDF details");
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching PDF details:", error);
      throw error;
    }
  }

  /**
   * Mark PDF as completed
   * Endpoint: POST /updatePDFProgress
   *
   * UPDATED: Now returns comprehensive progress data including module status
   */
  async markCompleted(
    courseId: string,
    request: MarkPDFCompletedRequest
  ): Promise<MarkPDFCompletedResponse["data"]> {
    try {
      console.log("📝 Marking PDF as completed:", {
        courseId,
        pdfId: request.pdfId,
        userId: request.userId,
        isCompleted: request.isCompleted,
      });

      const response = await apiService.post<MarkPDFCompletedResponse>(
        `/updatePDFProgress`,
        {
          userId: request.userId,
          pdfId: request.pdfId,
          courseId,
          isCompleted: request.isCompleted,
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update PDF progress");
      }

      console.log("✅ PDF progress updated successfully:", {
        pdfCompleted: response.data.pdfProgress.is_completed,
        courseProgress: response.data.courseProgress.progress_percentage + '%',
        moduleCompleted: response.data.moduleProgress?.is_completed,
      });

      return response.data;
    } catch (error) {
      console.error("❌ Error marking PDF as completed:", error);
      throw error;
    }
  }
}

export const pdfService = new PDFService();