/**
 * Notification Service for managing push notification tokens
 */

import apiService from "./apiService";

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
      console.error("Failed to remove push token:", error);
      throw error;
    }
  },
};

export default notificationService;
