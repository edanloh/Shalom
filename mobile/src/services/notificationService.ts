/**
 * Notification Service for managing push notification tokens
 */

import apiService from "./apiService";

export const notificationService = {
  /**
   * Register push notification token for a user
   */
  async registerPushToken(userId: string, pushToken: string) {
    try {
      const response = await apiService.post("/notifications/register", {
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
   */
  async removePushToken(userId: string, pushToken: string) {
    try {
      const response = await apiService.post("/notifications/unregister", {
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
};

export default notificationService;
