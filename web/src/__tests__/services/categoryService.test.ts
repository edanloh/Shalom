import { describe, expect, it } from 'vitest';
import categoryService from '@/services/categoryService';

describe('categoryService', () => {
  it('should be defined', () => {
    expect(categoryService).toBeDefined();
  });

  it('should have getAllCategories method', () => {
    expect(categoryService.getAllCategories).toBeDefined();
    expect(typeof categoryService.getAllCategories).toBe('function');
  });

  it('should have createCategory method', () => {
    expect(categoryService.createCategory).toBeDefined();
    expect(typeof categoryService.createCategory).toBe('function');
  });
});
