import apiService from './apiService';

const ENDPOINTS = {
  POST: '/postNotification',
};

export async function postNotification(payload: {
  userIds: string[];
  title: string;
  message: string;
  type: string;
}) {
  console.log('Posting notifications to userIds:', payload.userIds);
  const resp = await apiService.post<any>(ENDPOINTS.POST, payload);
  return resp?.data ?? resp;
}
