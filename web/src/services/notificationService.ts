import apiService from './apiService';

const ENDPOINTS = {
  POST: '/postNotification',
  LIST: '/getCourseNotifications',
};

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  action_url?: string | null;
  icon_url?: string | null;
};

const toNotification = (record: NotificationRecord): any => ({
  id: record.id,
  userId: record.user_id,
  title: record.title,
  message: record.message,
  type: record.type,
  read: record.is_read,
  createdAt: record.created_at,
  actionUrl: record.action_url ?? undefined,
  iconUrl: record.icon_url ?? undefined,
});

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

export async function getCourseNotifications(
  courseId: string,
  limitOrOptions: number | { limit?: number; offset?: number } = 50
): Promise<any[]> {
  const resolved =
    typeof limitOrOptions === "number"
      ? { limit: limitOrOptions, offset: 0 }
      : { limit: limitOrOptions.limit ?? 50, offset: limitOrOptions.offset ?? 0 };
  const resp = await apiService.get<any>(ENDPOINTS.LIST, {
    courseId,
    limit: String(resolved.limit),
    offset: String(resolved.offset),
  });
  const raw = resp?.data ?? resp ?? [];
  return Array.isArray(raw) ? raw.map(toNotification) : [];
}