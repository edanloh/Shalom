// services/categoryService.ts
/**
 * Category Service
 * Handles all API calls related to course categories
 */

import { apiService } from './apiService';

export interface Category {
  id: string;
  name: string;
  color?: string;
  course_count?: number;
  created_at?: string;
}

export interface AffectedCourse {
  id: string;
  title: string;
}

class CategoryService {
  /**
   * Fetch all categories
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await apiService.get('/categoryHandler');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Create a new category
   */
  async createCategory(name: string, color?: string): Promise<Category> {
    try {
      const response = await apiService.post('/categoryHandler', {
        name,
        color: color || '#ec4899'
      });
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update an existing category
   * @param id - Category ID
   * @param name - New category name
   * @param color - New category color (optional)
   */
  async updateCategory(id: string, name: string, color?: string): Promise<Category> {
    try { 
      // Check if name is actually an object
      if (typeof name === 'object') {
        console.error('ERROR: name is an object!', name);
        throw new Error('name parameter should be a string, got object');
      }
      
      const payload = {
        name,
        ...(color && { color })
      };
      
      const response = await apiService.put(`/categoryHandler/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await apiService.delete(`/categoryHandler/${id}`);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Get courses affected by a category (for deletion preview)
   */
  async getAffectedCourses(categoryId: string): Promise<AffectedCourse[]> {
    try {
      // Validate input
      if (!categoryId || categoryId.trim() === '') {
        console.error('[categoryService] Empty category ID provided!');
        return [];
      }            
      const response = await apiService.get(`/categoryHandler/${categoryId}/courses`);
          
      const courses = response.data || response.courses || response || [];      
      return courses;
    } catch (error) {
      console.error('[categoryService] Error fetching affected courses:', error);
      return [];
    }
  }
}

export default new CategoryService();