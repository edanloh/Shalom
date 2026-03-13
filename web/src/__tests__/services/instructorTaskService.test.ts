import { describe, expect, it } from 'vitest';
import { instructorTaskService } from '@/services/instructorTaskService';

describe('instructorTaskService', () => {
  it('should be defined', () => {
    expect(instructorTaskService).toBeDefined();
  });

  it('should have createTask method', () => {
    expect(instructorTaskService.createTask).toBeDefined();
    expect(typeof instructorTaskService.createTask).toBe('function');
  });

  it('should have deleteTask method', () => {
    expect(instructorTaskService.deleteTask).toBeDefined();
    expect(typeof instructorTaskService.deleteTask).toBe('function');
  });
});
