import { DeviceEventEmitter } from 'react-native';
import apiService from './apiService';
import { showToast } from '../components/common/Toast';
import {
  AchievementItem,
  CertificateProgress,
  CreditBalance,
  CreditEvent,
  CreditEventPayload,
  GoalTemplate,
  LearningGoal,
} from '../types';

// Module-level guard so recordDailyLogin only fires once per calendar day per session,
// even if the HomeScreen refocuses many times.
let _dailyLoginFiredDate: string | null = null;

const ENDPOINTS = {
  BALANCE: '/getCredits',
  HISTORY: '/getCreditHistory',
  ACHIEVEMENTS: '/getAchievements',
  GOALS: '/getGoals',
  CERTS: '/getCertificates',
  EVENTS: '/postCreditEvent',
  DAILY_ACTIVITY: '/recordDailyActivity',
  SET_GOAL_ACTIVE: '/setGoalActive',
  GOAL_TEMPLATES: '/getGoalTemplates',
  CREATE_GOALS: '/createGoalsFromTemplates',
  CLEAR_GOAL: '/clearGoal',
  SHOP_ITEMS: '/getShopItems',
  REDEEM: '/redeemCredits',
};

export const CREDIT_EVENT_CHANNEL = 'credits:updated';

export function subscribeToCreditUpdates(listener: () => void) {
  const sub = DeviceEventEmitter.addListener(CREDIT_EVENT_CHANNEL, listener);
  return () => sub.remove();
}

function emitCreditUpdate() {
  DeviceEventEmitter.emit(CREDIT_EVENT_CHANNEL);
}

export async function getCreditBalance(userId?: string): Promise<CreditBalance> {
  if (!userId) throw new Error('userId is required');
  const resp = await apiService.get<any>(ENDPOINTS.BALANCE, { userId });
  return resp?.data ?? resp;
}

export async function getCreditHistory(
  userId?: string,
  options?: { limit?: number; offset?: number }
): Promise<CreditEvent[]> {
  if (!userId) return [];
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const resp = await apiService.get<any>(ENDPOINTS.HISTORY, {
    userId,
    limit: String(limit),
    offset: String(offset),
  });
  return resp?.data ?? resp ?? [];
}

export async function getAchievements(
  userId?: string,
  options?: { limit?: number; offset?: number }
): Promise<AchievementItem[]> {
  if (!userId) return [];
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const resp = await apiService.get<any>(ENDPOINTS.ACHIEVEMENTS, {
    userId,
    limit: String(limit),
    offset: String(offset),
  });
  return resp?.data ?? resp ?? [];
}

export async function getGoals(userId?: string): Promise<LearningGoal[]> {
  if (!userId) return [];
  const resp = await apiService.get<any>(ENDPOINTS.GOALS, { userId });
  return resp?.data ?? resp ?? [];
}

export async function getGoalsWithProgress(userId?: string): Promise<{
  goals: LearningGoal[];
  completedCourses: number;
  totalTimeMinutes: number;
  streakDays: number;
}> {
  if (!userId) return { goals: [], completedCourses: 0, totalTimeMinutes: 0, streakDays: 0 };
  const resp = await apiService.get<any>(ENDPOINTS.GOALS, { userId });
  const data = resp?.data ?? resp;
  if (Array.isArray(data)) {
    return {
      goals: data,
      completedCourses: Number(resp?.completedCourses ?? 0),
      totalTimeMinutes: Number(resp?.totalTimeMinutes ?? 0),
      streakDays: Number(resp?.streakDays ?? 0),
    };
  }
  return {
    goals: Array.isArray(data?.data) ? data.data : [],
    completedCourses: Number(data?.completedCourses ?? resp?.completedCourses ?? 0),
    totalTimeMinutes: Number(data?.totalTimeMinutes ?? resp?.totalTimeMinutes ?? 0),
    streakDays: Number(data?.streakDays ?? resp?.streakDays ?? 0),
  };
}

export async function getCertificates(
  userId?: string,
  options?: { limit?: number; offset?: number }
): Promise<CertificateProgress[]> {
  if (!userId) return [];
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const resp = await apiService.get<any>(ENDPOINTS.CERTS, {
    userId,
    limit: String(limit),
    offset: String(offset),
  });
  return resp?.data ?? resp ?? [];
}

export async function recordCreditEvent(payload: CreditEventPayload) {
  if (!payload.userId) throw new Error('userId is required');
  const body = {
    userId: payload.userId,
    ...payload,
  };
  try {
    const resp = await apiService.post<any>(ENDPOINTS.EVENTS, body);
    console.info('credit_event_ok', {
      type: body.type,
      points: body.points,
      courseId: body.courseId,
    });
    const data = resp?.data ?? resp;
    const awarded = data?.awardedAchievements ?? [];
    if (Array.isArray(awarded) && awarded.length > 0) {
      const first = awarded[0];
      const title = awarded.length > 1 ? 'Achievements unlocked' : 'Achievement unlocked';
      const message =
        typeof first?.name === 'string' && awarded.length === 1
          ? first.name
          : typeof first?.name === 'string'
          ? `${first.name} +${awarded.length - 1} more`
          : awarded.length > 1
          ? `${awarded.length} new achievements`
          : 'New achievement unlocked';
      showToast({
        type: 'success',
        title,
        message,
        durationMs: 2600,
      });
    }
    emitCreditUpdate();
    return resp?.data ?? resp;
  } catch (err) {
    console.warn('credit_event_fail', {
      type: body.type,
      points: body.points,
      courseId: body.courseId,
      error: (err as any)?.message || err,
    });
    throw err;
  }
}


export async function setGoalActive(
  goalId: string,
  isActive: boolean,
  userId?: string
): Promise<LearningGoal | null> {
  if (!userId) throw new Error('userId is required');
  const resp = await apiService.post<any>(ENDPOINTS.SET_GOAL_ACTIVE, {
    userId,
    goalId,
    isActive,
  });
  return resp?.data ?? resp ?? null;
}

export async function getGoalTemplates(userId?: string): Promise<GoalTemplate[]> {
  if (!userId) throw new Error('userId is required');
  const resp = await apiService.get<any>(ENDPOINTS.GOAL_TEMPLATES, { userId });
  const raw = resp?.data ?? resp ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((t: any) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    difficulty: t.difficulty,
    targetHours: t.target_hours,
    targetCourses: t.target_courses,
    targetPoints: t.target_points,
    targetLessons: t.target_lessons,
    targetQuizzes: t.target_quizzes,
    durationDays: t.duration_days,
    rewardPoints: t.reward_points,
  }));
}

export async function createGoalsFromTemplates(
  templateIds: string[],
  userId?: string
): Promise<LearningGoal[]> {
  if (!userId) throw new Error('userId is required');
  const resp = await apiService.post<any>(ENDPOINTS.CREATE_GOALS, {
    userId,
    templateIds,
  });
  return resp?.data ?? resp ?? [];
}

export async function recordDailyLogin(userId?: string) {
  if (!userId) return;
  // Use a local date as a session-level guard only — the server will compute
  // the authoritative date from the user's stored timezone.
  const today = new Date().toLocaleDateString('en-CA');
  if (_dailyLoginFiredDate === today) return;
  _dailyLoginFiredDate = today;
  try {
    const resp = await apiService.post<any>(ENDPOINTS.DAILY_ACTIVITY, { userId });
    if (!resp?.data?.duplicate) {
      const creditsAwarded: number = resp?.data?.creditsAwarded ?? 0;
      if (creditsAwarded > 0) {
        showToast({
          type: 'success',
          title: 'Daily check-in',
          message: `+${creditsAwarded} credits earned`,
          durationMs: 2400,
        });
      }
      emitCreditUpdate();
    }
  } catch (err) {
    _dailyLoginFiredDate = null; // reset so we retry on next focus if it genuinely failed
    console.info('daily_login_skip', (err as any)?.message);
  }
}

export async function clearGoal(goalId: string, userId?: string): Promise<LearningGoal | null> {
  if (!userId) throw new Error('userId is required');
  const resp = await apiService.post<any>(ENDPOINTS.CLEAR_GOAL, { userId, goalId });
  return resp?.data ?? resp ?? null;
}

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  type: string;
  cost: number;
  icon: string;
  color: string;
  rarity: string;
  collection?: string | null;
  isFeatured?: boolean;
  isLimited?: boolean;
  isUnlocked: boolean;
  isEquipped: boolean;
  unlockedAt: string | null;
  canAfford: boolean;
};

export async function getShopItems(userId?: string): Promise<{ items: ShopItem[]; balance: number }> {
  if (!userId) return { items: [], balance: 0 };
  const resp = await apiService.get<any>(ENDPOINTS.SHOP_ITEMS, { userId });
  const data = resp?.data ?? resp;
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    balance: Number(data?.balance ?? 0),
  };
}

export async function purchaseShopItem(userId: string, itemId: string): Promise<{ newBalance: number }> {
  const resp = await apiService.post<any>(ENDPOINTS.REDEEM, { userId, itemId, action: 'purchase' });
  emitCreditUpdate();
  return { newBalance: resp?.data?.newBalance ?? 0 };
}

export async function equipShopItem(userId: string, itemId: string): Promise<void> {
  await apiService.post<any>(ENDPOINTS.REDEEM, { userId, itemId, action: 'equip' });
  // Intentionally no emitCreditUpdate — equipping doesn't change balance
}

export default {
  getCreditBalance,
  getCreditHistory,
  getAchievements,
  getGoals,
  getGoalsWithProgress,
  getCertificates,
  recordCreditEvent,
  recordDailyLogin,
  setGoalActive,
  getGoalTemplates,
  createGoalsFromTemplates,
  clearGoal,
  getShopItems,
  purchaseShopItem,
  equipShopItem,
  subscribeToCreditUpdates,
};
