// src/services/settingsService.ts
// UserService for fetching and updating user profile and info

import apiService from './apiService';

export async function getUserPreferences(
  user_id: string,
): Promise<any> {
  if (!user_id) throw new Error('user_id is required');
  const resp = await apiService.get<any>('/getUserPreferences', {user_id});
  return resp?.data ?? resp ?? [];
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