// src/services/userService.ts
// UserService for fetching and updating user profile and info

import apiService from './apiService';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  role?: string;
  // Add other fields as needed
}

export async function fetchUserProfile(
  email: string,
): Promise<UserProfile> {
  if (!email) throw new Error('email is required');
  const resp = await apiService.get<any>('/getUserInfo', {email});
  return resp?.data ?? resp ?? [];
}

export async function updateUserProfile(id: string, payload: Partial<UserProfile>): Promise<UserProfile> {
  const url = '/updateUserInfo';
  const resp = await apiService.patch<UserProfile>(url, { id, payload });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}