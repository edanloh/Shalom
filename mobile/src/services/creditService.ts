import { DeviceEventEmitter } from 'react-native';
import apiService from './apiService';
import { AchievementItem, CertificateProgress, CreditBalance, CreditEvent, CreditEventPayload, LearningGoal } from '../types';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID || '550e8400-e29b-41d4-a716-446655440101';

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

export async function getCertificates(userId?: string): Promise<CertificateProgress[]> {
  const uid = userId || DEFAULT_USER_ID;
  const resp = await apiService.get<any>(ENDPOINTS.CERTS, { userId: uid });
  return resp?.data ?? resp ?? [];
}

export async function recordCreditEvent(payload: CreditEventPayload) {
  const resp = await apiService.post<any>(ENDPOINTS.EVENTS, {
    userId: payload.userId || DEFAULT_USER_ID,
    ...payload,
  });
  emitCreditUpdate();
  return resp?.data ?? resp;
}

export default {
  getCreditBalance,
  getCreditHistory,
  getAchievements,
  getGoals,
  getCertificates,
  recordCreditEvent,
  subscribeToCreditUpdates,
};
