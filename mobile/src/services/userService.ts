// src/services/userService.ts
// UserService for fetching and updating user profile and info

import apiService from './apiService';
import { User } from '@/types';

export async function fetchUserProfile(
  email: string,
): Promise<User> {
  if (!email) throw new Error('email is required');
  const resp = await apiService.get<any>('/getUserInfo', {email});
  return resp?.data ?? resp ?? [];
}

export async function fetchAllUsers(): Promise<User[]> {
  const resp = await apiService.get<any>('/getAllUsers');
  return resp?.data ?? resp ?? [];
}

export async function fetchUserProfileById(
  id: string,
): Promise<User> {
  if (!id) throw new Error('id is required');
  const resp = await apiService.get<any>('/getUserInfoById', {id});
  return resp?.data ?? resp ?? [];
}

export async function updateUserProfile(
  id: string,
  payload: Partial<User>
): Promise<User> {
  const url = '/updateUserInfo';
  const resp = await apiService.patch<User>(url, { id, payload });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}

export async function uploadProfilePic(name: string, avatar: Blob): Promise<any> {
  const url = '/uploadProfilePic';
  const arrayBuffer = await new Response(avatar).arrayBuffer();
  const resp = await apiService.post<any>(url, arrayBuffer, {
    headers: {
      'Content-Type': avatar.type,
      'x-file-name': name,
    },
  });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}

export async function registerCheck(user: User): Promise<any> {
  const url = '/registerCheck';
  console.log("registerCheck userService", user);
  const resp = await apiService.post<any>(url, { user });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}