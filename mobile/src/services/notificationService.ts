/**
 * Notification Service for managing push notification tokens
 */

import apiService from "./apiService";
import type { Notification } from "../types";

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  action_url?: string | null;
};

const normalizeNotificationType = (value?: string): Notification["type"] => {
  if (value === "course" || value === "achievement" || value === "reminder") {
    return value;
  }
  return "system";
};

const toNotification = (record: NotificationRecord): Notification => ({
  id: record.id,
  userId: record.user_id,
  title: record.title,
  message: record.message,
  type: normalizeNotificationType(record.type),
  read: record.is_read,
  createdAt: record.created_at,
  actionUrl: record.action_url ?? undefined,
});

const ENDPOINTS = {
  LIST: "/getNotifications",
  CREATE: "/postNotification",
  MARK_READ: "/markNotificationRead",
  MARK_ALL_READ: "/markAllNotificationsRead",
  DELETE: "/deleteNotification",
  CLEAR: "/clearNotifications",
} as const;

export const notificationService = {
  /**
   * Register push notification token for a user
   * Endpoint: POST /pushNotificationHandler
   * Maps to pushNotificationHandler.mjs Lambda function
   */
  async registerPushToken(userId: string, pushToken: string) {
    try {
      const response = await apiService.post("/pushNotificationHandler", {
        action: "register",
        userId,
        pushToken,
        platform: "expo",
      });
      return response;
    } catch (error) {
      const status = (error as any)?.status ?? (error as any)?.statusCode;
      if (status === 404) {
        console.warn("Push register endpoint not found; skipping register");
        return null;
      }
      console.error("Failed to register push token:", error);
      throw error;
    }
  },

  /**
   * Remove push notification token (on logout)
   * Endpoint: POST /pushNotificationHandler
   * Maps to pushNotificationHandler.mjs Lambda function
   */
  async removePushToken(userId: string, pushToken: string) {
    try {
      const response = await apiService.post("/pushNotificationHandler", {
        action: "unregister",
        userId,
        pushToken,
      });
      return response;
    } catch (error) {
      const status = (error as any)?.status ?? (error as any)?.statusCode;
      if (status === 404) {
        console.warn("Push unregister endpoint not found; skipping unregister");
        return null;
      }
      console.error("Failed to remove push token:", error);
      throw error;
    }
  },

  async getNotifications(
    userId: string,
    limitOrOptions: number | { limit?: number; offset?: number } = 50
  ): Promise<Notification[]> {
    const resolved =
      typeof limitOrOptions === "number"
        ? { limit: limitOrOptions, offset: 0 }
        : { limit: limitOrOptions.limit ?? 50, offset: limitOrOptions.offset ?? 0 };
    const resp = await apiService.get<any>(ENDPOINTS.LIST, {
      userId,
      limit: String(resolved.limit),
      offset: String(resolved.offset),
    });
    const raw = resp?.data ?? resp ?? [];
    return Array.isArray(raw) ? raw.map(toNotification) : [];
  },

  async createNotification(
    input: Omit<Notification, "id" | "read" | "createdAt"> &
      Partial<Pick<Notification, "createdAt" | "read">>
  ): Promise<Notification | null> {
    const payload = {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      actionUrl: input.actionUrl,
      createdAt: input.createdAt,
    };
    const resp = await apiService.post<any>(ENDPOINTS.CREATE, payload);
    const raw = resp?.data ?? resp;
    if (!raw) return null;
    return toNotification(raw as NotificationRecord);
  },

  async markNotificationRead(
    userId: string,
    notificationId: string
  ): Promise<Notification | null> {
    const resp = await apiService.post<any>(ENDPOINTS.MARK_READ, {
      userId,
      notificationId,
    });
    const raw = resp?.data ?? resp;
    if (!raw) return null;
    return toNotification(raw as NotificationRecord);
  },

  async markAllNotificationsRead(userId: string): Promise<number> {
    const resp = await apiService.post<any>(ENDPOINTS.MARK_ALL_READ, { userId });
    return Number(resp?.data?.updated ?? resp?.updated ?? 0);
  },

  async clearNotifications(userId: string): Promise<number> {
    const resp = await apiService.post<any>(ENDPOINTS.CLEAR, { userId });
    return Number(resp?.data?.deleted ?? resp?.deleted ?? 0);
  },

  async deleteNotification(userId: string, notificationId: string): Promise<number> {
    const resp = await apiService.post<any>(ENDPOINTS.DELETE, { userId, notificationId });
    return Number(resp?.data?.deleted ?? resp?.deleted ?? 0);
  },
};

export default notificationService;
