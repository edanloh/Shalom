// hooks/useCategories.ts
/**
 * Custom Hook: useCategories
 * Handles fetching and managing course categories
 */

import { useState, useEffect, useCallback } from 'react';
import categoryService, { Category, AffectedCourse } from '../services/categoryService';

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  createCategory: (name: string, color?: string) => Promise<Category>;
  updateCategory: (id: string, name: string, color?: string) => Promise<Category>; 
  deleteCategory: (id: string) => Promise<void>;
  getAffectedCourses: (categoryId: string) => Promise<AffectedCourse[]>;
  refetch: () => Promise<void>;
}

export const useCategories = (): UseCategoriesResult => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getAllCategories();
      setCategories(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      console.error('useCategories - fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(async (name: string, color?: string) => {
    try {
      setError(null);
      const newCategory = await categoryService.createCategory(name, color);
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return newCategory;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, name: string, color?: string) => {
    try {
      setError(null);
      // Pass parameters separately, not as object
      const updated = await categoryService.updateCategory(id, name, color); // ✅
      setCategories(prev =>
        prev.map(cat => (cat.id === id ? updated : cat)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      setError(null);
      await categoryService.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getAffectedCourses = useCallback(async (categoryId: string): Promise<AffectedCourse[]> => {
    try {
      setError(null);
      return await categoryService.getAffectedCourses(categoryId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch affected courses';
      setError(errorMessage);
      console.error('useCategories - getAffectedCourses error:', err);
      return [];
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    getAffectedCourses,
    refetch
  };
};