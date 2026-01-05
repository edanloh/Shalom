/**
 * PDF Service - Handles all PDF-related API calls
 * Integrates with AWS Lambda backend for PDF access and progress tracking
 */

import { apiService } from "./apiService";

// PDF Detail Response
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
      previousPDF: { id: string; title: string } | null;
      nextPDF: { id: string; title: string } | null;
    };
    userProgress?: {
      is_completed: boolean;
      completed_at?: string;
      updated_at?: string;
    };
  };
}

// Mark PDF as Completed Request
export interface MarkPDFCompletedRequest {
  userId: string;
  pdfId: string;
  isCompleted: boolean;
}

// Mark PDF as Completed Response
export interface MarkPDFCompletedResponse {
  success: boolean;
  message: string;
  data: {
    pdfProgress: {
      user_id: string;
      pdf_id: string;
      is_completed: boolean;
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
   * Endpoint: POST /courses/{courseId}/module/pdfs/progress
   *
   * This should be called when user marks the PDF as completed
   */
  async markCompleted(
    courseId: string,
    request: MarkPDFCompletedRequest
  ): Promise<MarkPDFCompletedResponse["data"]> {
    try {
      console.log("🔵 Mock: Marking PDF as completed");
      console.log("📦 Request payload:", {
        courseId,
        pdfId: request.pdfId,
        userId: request.userId,
        isCompleted: request.isCompleted,
      });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock return for testing without backend
      const mockResponse: MarkPDFCompletedResponse["data"] = {
        pdfProgress: {
          user_id: request.userId,
          pdf_id: request.pdfId,
          is_completed: request.isCompleted,
          completed_at: request.isCompleted
            ? new Date().toISOString()
            : undefined,
          updated_at: new Date().toISOString(),
        },
        courseProgress: {
          progress_percentage: "75.5",
          is_completed: false,
          completed_items: 15,
          total_items: 20,
        },
      };

      console.log("✅ Mock: PDF marked as completed successfully");
      return mockResponse;

      /* Uncomment when backend is ready:
      const endpoint = `/courses/${courseId}/module/pdfs/progress`;
      console.log("🔵 API Call: POST", endpoint);
      console.log("📦 Request payload:", {
        courseId,
        pdfId: request.pdfId,
        userId: request.userId,
        isCompleted: request.isCompleted,
      });

      const response = await apiService.post<MarkPDFCompletedResponse>(
        endpoint,
        request
      );

      console.log("🟢 API Response received:", {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
      });

      if (!response.success || !response.data) {
        console.error("❌ API returned unsuccessful response:", response);
        throw new Error(response.message || "Failed to mark PDF as completed");
      }

      console.log("✅ PDF marked as completed successfully");
      return response.data;
      */
    } catch (error) {
      console.error("❌ Error marking PDF as completed:", error);
      throw error;
    }
  }
}

export const pdfService = new PDFService();
