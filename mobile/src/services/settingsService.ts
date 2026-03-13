// src/services/settingsService.ts
// UserService for fetching and updating user profile and info

import apiService from './apiService';
import { ApiError } from './apiService';

export async function getUserPreferences(
  user_id: string,
): Promise<any> {
  if (!user_id) throw new Error('user_id is required');
  try {
    const resp = await apiService.get<any>('/getUserPreferences', {user_id});
    return resp?.data ?? resp ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {};
    }
    throw error;
  }
}

export async function setUserPreferences(
  user_id: string,
  preference: string
): Promise<any> {
  const url = '/setUserPreferences';
  const resp = await apiService.post<any>(url, { user_id, preference });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}
