/**
 * Document Service - Handles all document-related API calls (PDF, PPTX, DOCX)
 * Integrates with Supabase backend for document access and progress tracking
 */

import { apiService } from "./apiService";

export interface DocumentDetailResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    title: string;
    description: string;
    pdf_url?: string; // Legacy support
    resource_url: string;
    resource_type: string; // 'pdf', 'document' (DOCX), 'ppt' (PPTX)
    file_size_bytes?: number;
    is_downloadable?: boolean;
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
      previousItem: { id: string; title: string; type: 'video' | 'pdf' | 'document' | 'ppt' | 'quiz' } | null;
      nextItem: { id: string; title: string; type: 'video' | 'pdf' | 'document' | 'ppt' | 'quiz' } | null;
    };
    userProgress?: {
      is_completed: boolean;
      completed_at?: string;
      updated_at?: string;
    };
  };
}

export interface MarkDocumentCompletedRequest {
  userId: string;
  documentId: string;
  isCompleted: boolean;
}

export interface MarkDocumentCompletedResponse {
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

class DocumentService {
  /**
   * Get document details with navigation and user progress (PDF, PPTX, DOCX)
   * Endpoint: GET /courses/{courseId}/module/pdfs/{documentId}?userId={userId}
   */
  async getDocumentDetail(
    courseId: string,
    documentId: string,
    userId?: string
  ): Promise<DocumentDetailResponse["data"]> {
    try {
      const params: Record<string, string> = {};
      if (userId) {
        params.userId = userId;
      }

      const response = await apiService.get<DocumentDetailResponse>(
        `/courses/${courseId}/module/pdfs/${documentId}`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch document details");
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching PDF details:", error);
      throw error;
    }
  }

  /**
   * Mark document as completed (PDF, PPTX, DOCX)
   * Endpoint: POST /updatePDFProgress
   *
   * UPDATED: Now returns comprehensive progress data including module status
   */
  async markCompleted(
    courseId: string,
    request: MarkDocumentCompletedRequest
  ): Promise<MarkDocumentCompletedResponse["data"]> {
    try {
      console.log("📝 Marking document as completed:", {
        courseId,
        documentId: request.documentId,
        userId: request.userId,
        isCompleted: request.isCompleted,
      });

      const response = await apiService.post<MarkDocumentCompletedResponse>(
        `/updatePDFProgress`,
        {
          userId: request.userId,
          pdfId: request.documentId, // Backend still uses pdfId parameter name
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

export const documentService = new DocumentService();
export const pdfService = documentService; // Legacy export for backwards compatibility