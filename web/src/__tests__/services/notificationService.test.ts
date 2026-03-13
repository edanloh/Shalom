import { describe, expect, it } from 'vitest';
import { notificationService } from '@/services/notificationService';

describe('notificationService', () => {
  it('should be defined', () => {
    expect(notificationService).toBeDefined();
  });

  it('should have getNotifications method', () => {
    expect(notificationService.getNotifications).toBeDefined();
    expect(typeof notificationService.getNotifications).toBe('function');
  });

  it('should have createNotification method', () => {
    expect(notificationService.createNotification).toBeDefined();
    expect(typeof notificationService.createNotification).toBe('function');
  });

  it('should have markNotificationRead method', () => {
    expect(notificationService.markNotificationRead).toBeDefined();
    expect(typeof notificationService.markNotificationRead).toBe('function');
  });

  it('should have markAllNotificationsRead method', () => {
    expect(notificationService.markAllNotificationsRead).toBeDefined();
    expect(typeof notificationService.markAllNotificationsRead).toBe('function');
  });

  it('should have deleteNotification method', () => {
    expect(notificationService.deleteNotification).toBeDefined();
  });
});
