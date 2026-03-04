/**
 * Module Service - Handles course module and content-related API calls
 */

import apiService from './apiService';

// export interface ModuleDetail {
//   id: number;
//   title: string;
//   description: string;
//   order_index: number;
//   lessons: Lesson[];
//   quizzes: Quiz[];
// }

// export interface Lesson {
//   id: number;
//   title: string;
//   content: string;
//   video_url?: string;
//   thumbnail_url?: string;
//   duration: string;
//   duration_seconds?: number;
//   is_preview?: boolean;
//   order_index: number;
// }

// export interface Quiz {
//   id: number;
//   title: string;
//   description: string;
//   questions: Question[];
// }

// export interface Question {
//   id: number;
//   question_text: string;
//   question_type: 'multiple_choice' | 'true_false' | 'short_answer';
//   options?: string[];
//   correct_answer: string;
//   explanation?: string;
// }

class ModuleService {
  /**
   * Get all modules (sections) for a course - INSTRUCTOR VIEW with quiz questions
   * @param courseId - The course ID
   * @param adminId - The instructor/admin ID (optional, will use a default if not provided)
   */
  async getCourseModules(courseId: string, adminId?: string): Promise<ModuleDetail[]> {
    try {
      // Use instructor endpoint to get full details including quiz questions
      const instructorId = adminId || '550e8400-e29b-41d4-a716-446655440201';
      // const response = await apiService.get<any>(`/admin/${instructorId}/${courseId}`);
      const response = await apiService.get<any>(`/getModuleDetailInstructor/${instructorId}/${courseId}`);
      if (!response || !response.data || !response.data.sections) {
        console.warn('No sections found in response:', response);
        return [];
      }

      // Transform sections to ModuleDetail format
      const modules: ModuleDetail[] = response.data.sections.map((section: any) => {
        // Extract lessons (videos) and quizzes from items array
        const lessons: Lesson[] = section.items
          ?.filter((item: any) => item.type === 'video')
          .map((video: any) => ({
            id: video.id,
            title: video.title,
            content: video.description || '',
            video_url: video.video_url || '',
            thumbnail_url: video.thumbnail_url || '',
            duration: `${Math.floor((video.duration_seconds || 0) / 60)} min`,
            duration_seconds: video.duration_seconds || 0,
            is_preview: video.is_preview || false,
            order_index: video.order_index
          })) || [];

        const quizzes: Quiz[] = section.items
          ?.filter((item: any) => item.type === 'quiz')
          .map((quiz: any) => ({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description || '',
            questions: (quiz.questions || []).map((q: any) => ({
              id: q.id,
              question_text: q.text || q.question_text, // Backend returns 'text' field
              question_type: q.type || q.question_type, // Backend returns 'type' field
              options: q.options || [],
              correct_answer: q.correctAnswer || q.correct_answer, // Backend returns 'correctAnswer'
              explanation: q.explanation
            }))
          })) || [];

        return {
          id: section.id,
          title: section.title,
          description: section.description || '',
          order_index: section.order_index,
          lessons,
          quizzes
        };
      });

      console.log(`Fetched ${modules.length} modules with lessons and quizzes`);
      return modules;
    } catch (error) {
      console.error(`Error fetching modules for course ${courseId}:`, error);
      return [];
    }
  }

  /**
   * Get specific module details
   */
  async getModuleById(courseId: string, moduleId: string): Promise<ModuleDetail | null> {
    try {
      const response = await apiService.get<any>(`/courses/${courseId}/modules/${moduleId}`);
      
      if (!response || !response.module) {
        return null;
      }

      return response.module;
    } catch (error) {
      console.error(`Error fetching module ${moduleId}:`, error);
      return null;
    }
  }

  /**
   * Create a new module
   */
  async createModule(courseId: string, moduleData: {
    title: string;
    description: string;
    order_index: number;
  }): Promise<ModuleDetail> {
    try {
      const response = await apiService.post<any>(
        `/courses/${courseId}/modules`,
        moduleData
      );

      if (!response || !response.module) {
        throw new Error('Failed to create module');
      }

      return response.module;
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  }

  /**
   * Update a module
   */
  async updateModule(
    courseId: string,
    moduleId: string,
    moduleData: Partial<ModuleDetail>
  ): Promise<ModuleDetail> {
    try {
      // const response = await apiService.put<any>(
      //   `/courses/${courseId}/modules/${moduleId}`,
      //   moduleData
      // );
      const response = await apiService.put<any>(
        `/updateCourse/${courseId}`,
        moduleData
      );

      if (!response || !response.module) {
        throw new Error('Failed to update module');
      }

      return response.module;
    } catch (error) {
      console.error(`Error updating module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a module
   */
  async deleteModule(courseId: string, moduleId: string): Promise<void> {
    try {
      await apiService.delete(`/courses/${courseId}/modules/${moduleId}`);
    } catch (error) {
      console.error(`Error deleting module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Update a course with its modules, lessons, and quizzes
   * @param courseId - The course ID to update
   * @param courseData - Complete course data including modules
   */
  async updateCourse(courseId: string, courseData: any): Promise<any> {
    try {
      const response = await apiService.post(`/updateCourse/${courseId}`, courseData);
      return response;
    } catch (error) {
      console.error(`Error updating course ${courseId}:`, error);
      throw error;
    }
  }

  /**
   * Submit quiz answers for grading
   * @param quizId - The quiz ID
   * @param userId - The user ID submitting the quiz
   * @param answers - Array of answers: [{ questionId: string, answer: string }]
   * @param timeTakenMinutes - Optional time taken to complete the quiz
   */
  async submitQuiz(
    quizId: string,
    userId: string,
    answers: Array<{ questionId: string; answer: string }>,
    timeTakenMinutes?: number
  ): Promise<any> {
    try {
      const response = await apiService.post(`/submitQuiz/${quizId}`, {
        userId,
        answers,
        timeTakenMinutes
      });
      return response;
    } catch (error) {
      console.error(`Error submitting quiz ${quizId}:`, error);
      throw error;
    }
  }

  async getModuleDetailInstructor(
    adminId: string, courseId: string
  ): Promise<any> {
    try {
      const response = await apiService.get(`/getModuleDetailInstructor/${adminId}/${courseId}`)
      return response;
    } catch (error) {
      console.error(`Error getting module details for instructor ${adminId} and course ${courseId}:`, error);
      throw error;
    }
  }
}

export const moduleService = new ModuleService();
export default moduleService;
