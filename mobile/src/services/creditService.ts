import { DeviceEventEmitter } from 'react-native';
import apiService from './apiService';
import { showToast } from '../components/common/Toast';
import { AchievementItem, CertificateProgress, CreditBalance, CreditEvent, CreditEventPayload, LearningGoal } from '../types';

const GOAL_HIT_POINTS = 50;
const STREAK_INCREMENT_POINTS = 10;

type GoalSnapshot = {
  id: string;
  current: number;
  target: number;
  label: string;
};

let lastGoalSnapshot: { streakDays: number; goals: GoalSnapshot[] } | null = null;

const ENDPOINTS = {
  BALANCE: '/getCredits',
  HISTORY: '/getCreditHistory',
  ACHIEVEMENTS: '/getAchievements',
  GOALS: '/getGoals',
  CERTS: '/getCertificates',
  EVENTS: '/postCreditEvent',
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
}> {
  if (!userId) return { goals: [], completedCourses: 0 };
  const resp = await apiService.get<any>(ENDPOINTS.GOALS, { userId });
  const data = resp?.data ?? resp;
  if (Array.isArray(data)) {
    return {
      goals: data,
      completedCourses: Number(resp?.completedCourses ?? 0),
    };
  }
  return {
    goals: Array.isArray(data?.data) ? data.data : [],
    completedCourses: Number(data?.completedCourses ?? resp?.completedCourses ?? 0),
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

export async function recordGoalMilestones(goals: LearningGoal[], userId?: string) {
  if (!userId) return;
  const raw = Array.isArray(goals) ? goals : [];
  const snapshot: GoalSnapshot[] = raw.map((g, idx) => {
    const target = Number(g.targetPoints ?? g.targetCourses ?? g.targetHours ?? 0);
    const current = Number(g.currentPoints ?? g.currentCourses ?? g.currentHours ?? 0);
    const label = g.label || 'Goal';
    const id = String(g.id || label || `goal_${idx}`);
    return { id, current, target, label };
  });
  const maxStreak = raw.reduce((max, g) => Math.max(max, Number(g.streakDays || 0)), 0);
  const prev = lastGoalSnapshot;

  lastGoalSnapshot = { streakDays: maxStreak, goals: snapshot };

  if (!prev) return;

  const prevById = new Map(prev.goals.map((g) => [g.id, g]));
  const goalHits = snapshot.filter((g) => {
    if (g.target <= 0) return false;
    const prevGoal = prevById.get(g.id);
    return (prevGoal?.current ?? 0) < g.target && g.current >= g.target;
  });
  const streakIncreased = maxStreak > prev.streakDays ? maxStreak : null;

  try {
    const events = goalHits.map((g) =>
      recordCreditEvent({
        userId,
        type: 'goal_hit',
        title: `${g.label} goal hit`,
        points: GOAL_HIT_POINTS,
        referenceKey: `goal_hit:${g.id}`,
      })
    );
    if (streakIncreased != null) {
      events.push(
        recordCreditEvent({
          userId,
          type: 'streak_increment',
          title: `Streak extended to ${streakIncreased} days`,
          points: STREAK_INCREMENT_POINTS,
          referenceKey: `streak_increment:${streakIncreased}`,
        })
      );
    }
    await Promise.all(events);
  } catch (err) {
    console.warn('credit_goal_milestone_fail', err);
  }
}

export default {
  getCreditBalance,
  getCreditHistory,
  getAchievements,
  getGoals,
  getGoalsWithProgress,
  getCertificates,
  recordCreditEvent,
  recordGoalMilestones,
  subscribeToCreditUpdates,
};
