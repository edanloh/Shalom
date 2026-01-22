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
  const results = await Promise.all(
    payload.userIds.map((userId) => {
      const singlePayload = {
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
      };
      return apiService.post<any>(ENDPOINTS.POST, singlePayload);
    }),
  );
  return results.map((resp) => resp?.data ?? resp);
}
