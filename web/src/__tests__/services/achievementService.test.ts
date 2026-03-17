import { describe, expect, it } from 'vitest';
import * as achievementService from '@/services/achievementService';

describe('achievementService', () => {
  it('should be defined', () => {
    expect(achievementService).toBeDefined();
  });

  it('should have listAchievements method', () => {
    expect(achievementService.listAchievements).toBeDefined();
    expect(typeof achievementService.listAchievements).toBe('function');
  });

  it('should have createAchievement method', () => {
    expect(achievementService.createAchievement).toBeDefined();
  });

  it('should have deleteAchievement method', () => {
    expect(achievementService.deleteAchievement).toBeDefined();
  });

  it('should have uploadAchievementIcon method', () => {
    expect(achievementService.uploadAchievementIcon).toBeDefined();
  });
});

