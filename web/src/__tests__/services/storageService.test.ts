import { describe, expect, it } from 'vitest';
import { StorageService } from '@/services/storageService';

describe('storageService', () => {
  it('should be defined', () => {
    expect(StorageService).toBeDefined();
  });

  it('should have uploadFile method', () => {
    expect(StorageService.uploadFile).toBeDefined();
    expect(typeof StorageService.uploadFile).toBe('function');
  });

  it('should have uploadVideo method', () => {
    expect(StorageService.uploadVideo).toBeDefined();
    expect(typeof StorageService.uploadVideo).toBe('function');
  });

  it('should have deleteFile method', () => {
    expect(StorageService.deleteFile).toBeDefined();
    expect(typeof StorageService.deleteFile).toBe('function');
  });
});
