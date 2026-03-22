import { describe, expect, it } from 'vitest';
import { studentService } from '@/services/studentService';

describe('studentService', () => {
  it('should be defined', () => {
    expect(studentService).toBeDefined();
  });

  it('should have getStudentProfile method', () => {
    expect(studentService.getStudentProfile).toBeDefined();
    expect(typeof studentService.getStudentProfile).toBe('function');
  });
});
