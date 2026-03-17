import { describe, expect, it } from 'vitest';
import { analyticsService } from '@/services/analyticsService';

describe('analyticsService', () => {
  it('should be defined', () => {
    expect(analyticsService).toBeDefined();
  });

  it('should have getInstructorAnalytics method', () => {
    expect(analyticsService.getInstructorAnalytics).toBeDefined();
    expect(typeof analyticsService.getInstructorAnalytics).toBe('function');
  });
});
