import { describe, expect, it } from 'vitest';
import { apiService } from '@/services/apiService';

describe('apiService', () => {
  it('should be defined', () => {
    expect(apiService).toBeDefined();
  });

  it('should have get method', () => {
    expect(apiService.get).toBeDefined();
    expect(typeof apiService.get).toBe('function');
  });

  it('should have post method', () => {
    expect(apiService.post).toBeDefined();
    expect(typeof apiService.post).toBe('function');
  });

  it('should have put method', () => {
    expect(apiService.put).toBeDefined();
    expect(typeof apiService.put).toBe('function');
  });

  it('should have delete method', () => {
    expect(apiService.delete).toBeDefined();
    expect(typeof apiService.delete).toBe('function');
  });

  it('should have patch method', () => {
    expect(apiService.patch).toBeDefined();
    expect(typeof apiService.patch).toBe('function');
  });
});
