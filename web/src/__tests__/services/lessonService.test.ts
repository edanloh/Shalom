import { describe, expect, it } from 'vitest';
import { lessonService } from '@/services/lessonService';

describe('lessonService', () => {
  it('should be defined', () => {
    expect(lessonService).toBeDefined();
  });

  it('should have getLessonDetail method', () => {
    expect(lessonService.getLessonDetail).toBeDefined();
    expect(typeof lessonService.getLessonDetail).toBe('function');
  });
});
