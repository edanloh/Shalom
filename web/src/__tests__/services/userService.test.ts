import { describe, expect, it } from 'vitest';
import * as userService from '@/services/userService';

describe('userService', () => {
  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  it('should have fetchUserProfile method', () => {
    expect(userService.fetchUserProfile).toBeDefined();
    expect(typeof userService.fetchUserProfile).toBe('function');
  });

  it('should have updateUserProfile method', () => {
    expect(userService.updateUserProfile).toBeDefined();
  });

  it('should have fetchAllUsers method', () => {
    expect(userService.fetchAllUsers).toBeDefined();
  });

  it('should have uploadProfilePic method', () => {
    expect(userService.uploadProfilePic).toBeDefined();
  });

  it('should have registerCheck method', () => {
    expect(userService.registerCheck).toBeDefined();
  });
});
