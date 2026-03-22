import { describe, expect, it } from 'vitest';
import courseService from '@/services/courseService';

describe('courseService', () => {
  it('should be defined', () => {
    expect(courseService).toBeDefined();
  });

  it('should have getCourses method', () => {
    expect(courseService.getCourses).toBeDefined();
    expect(typeof courseService.getCourses).toBe('function');
  });

  it('should have getCourseDetailData method', () => {
    expect(courseService.getCourseDetailData).toBeDefined();
    expect(typeof courseService.getCourseDetailData).toBe('function');
  });

  it('should have createCourse method', () => {
    expect(courseService.createCourse).toBeDefined();
    expect(typeof courseService.createCourse).toBe('function');
  });

  it('should have updateCourseWithModules method', () => {
    expect(courseService.updateCourseWithModules).toBeDefined();
    expect(typeof courseService.updateCourseWithModules).toBe('function');
  });
});
