import { DeviceEventEmitter } from 'react-native';
import apiService from './apiService';
import { AchievementItem, CertificateProgress, CreditBalance, CreditEvent, CreditEventPayload, LearningGoal } from '../types';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID || '550e8400-e29b-41d4-a716-446655440101';
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
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.BALANCE, { userId: uid });
  return resp?.data ?? resp;
}

export async function getCreditHistory(userId?: string): Promise<CreditEvent[]> {
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.HISTORY, { userId: uid });
  return resp?.data ?? resp ?? [];
}

export async function getAchievements(userId?: string): Promise<AchievementItem[]> {
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.ACHIEVEMENTS, { userId: uid });
  return resp?.data ?? resp ?? [];
}

export async function getGoals(userId?: string): Promise<LearningGoal[]> {
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.GOALS, { userId: uid });
  return resp?.data ?? resp ?? [];
}

export async function getGoalsWithProgress(userId?: string): Promise<{
  goals: LearningGoal[];
  completedCourses: number;
}> {
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.GOALS, { userId: uid });
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

export async function getCertificates(userId?: string): Promise<CertificateProgress[]> {
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.CERTS, { userId: uid });
  return resp?.data ?? resp ?? [];
}

export async function recordCreditEvent(payload: CreditEventPayload) {
  const body = {
    userId: payload.userId || DEFAULT_USER_ID,
    ...payload,
  };
  try {
    const resp = await apiService.post<any>(ENDPOINTS.EVENTS, body);
    console.info('credit_event_ok', {
      type: body.type,
      points: body.points,
      courseId: body.courseId,
    });
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
        userId: userId || DEFAULT_USER_ID,
        type: 'goal_hit',
        title: `${g.label} goal hit`,
        points: GOAL_HIT_POINTS,
        referenceKey: `goal_hit:${g.id}`,
      })
    );
    if (streakIncreased != null) {
      events.push(
        recordCreditEvent({
          userId: userId || DEFAULT_USER_ID,
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
