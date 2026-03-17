import { describe, expect, it } from 'vitest';
import { moduleService } from '@/services/moduleService';

describe('moduleService', () => {
  it('should be defined', () => {
    expect(moduleService).toBeDefined();
  });

  it('should have getCourseModules method', () => {
    expect(moduleService.getCourseModules).toBeDefined();
    expect(typeof moduleService.getCourseModules).toBe('function');
  });
});
