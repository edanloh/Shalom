import apiService from './apiService';

import { User } from '@/types';

const ENDPOINTS = {
  POST: '/postNotification',
};

export async function fetchUserProfile(email: string): Promise<User> {
  if (!email) throw new Error('email is required');
  const resp = await apiService.get<any>('/getUserInfo', { email });
  return resp?.data ?? resp ?? [];
}

export async function updateUserProfile(
  id: string,
  payload: Partial<User>,
): Promise<User> {
  const url = '/updateUserInfo';
  const resp = await apiService.patch<User>(url, { id, payload });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}

export async function uploadProfilePic(
  name: string,
  avatar: Blob,
): Promise<any> {
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
  const resp = await apiService.post<any>(url, { user });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}

export async function approveInstructor(id: string, access_token: string): Promise<any> {
  const url = '/approveInstructor';
  const resp = await apiService.post<any>(url, { id }, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const data: any = (resp as any)?.data ?? (resp as any);
  return data?.data ?? data;
}
