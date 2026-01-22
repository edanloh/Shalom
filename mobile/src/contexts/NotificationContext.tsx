import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { Platform, Alert, DeviceEventEmitter } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useUser } from "./UserContext";
import notificationService from "../services/notificationService";
import { CREDIT_EVENT_CHANNEL } from "../services/creditService";
import { TOAST_CHANNEL, showToast, type ToastPayload } from "../components/common/Toast";
import type { Notification as InAppNotification } from "../types";

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function handleRegistrationError(errorMessage: string) {
  console.warn(errorMessage);
}

const MAX_IN_APP_NOTIFICATIONS = 200;
const NOTIFICATION_PAGE_SIZE = 25;
const TOASTABLE_TYPES = new Set([
  "streak_reminder",
  "streak_broken",
  "streak_hot",
  "goal_completed",
  "goal_expired",
  "course",
]);

const toastTypeForNotification = (type?: string): ToastPayload["type"] => {
  if (type === "streak_hot" || type === "goal_completed" || type === "course") return "success";
  if (type === "streak_broken" || type === "goal_expired") return "error";
  return "info";
};

async function registerForPushNotificationsAsync(skipPrompt: boolean = false) {
  // Android: Set up notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // iOS & Android: Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If permission not granted and we should prompt
  if (existingStatus !== "granted" && !skipPrompt) {
    // Check if this is first time
    const hasPrompted = await SecureStore.getItemAsync(
      "@notification_prompted"
    );

    if (!hasPrompted) {
      // Show alert on first app open
      await new Promise<void>((resolve) => {
        Alert.alert(
          "Enable Notifications",
          "Stay updated with course content, achievements, and reminders. Would you like to enable notifications?",
          [
            {
              text: "Not Now",
              style: "cancel",
              onPress: () => {
                SecureStore.setItemAsync("@notification_prompted", "true");
                resolve();
              },
            },
            {
              text: "Enable",
              onPress: async () => {
                SecureStore.setItemAsync("@notification_prompted", "true");
                const { status } =
                  await Notifications.requestPermissionsAsync();
                finalStatus = status;
                resolve();
              },
            },
          ]
        );
      });
    } else {
      // Already prompted before, just request
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
  }

  if (finalStatus !== "granted") {
    handleRegistrationError(
      "Permission not granted to get push token for push notification!"
    );
    return;
  }

  // Get push token
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    handleRegistrationError("Project ID not found");
    return;
  }

  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    console.log("Push token:", pushTokenString);
    return pushTokenString;
  } catch (e: unknown) {
    handleRegistrationError(`${e}`);
  }
}

interface NotificationContextType {
  expoPushToken: string;
  notification: Notifications.Notification | undefined;
  registerTokenWithBackend: () => Promise<void>;
  removeTokenFromBackend: () => Promise<void>;
  inAppNotifications: InAppNotification[];
  reloadNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  hasMoreNotifications: boolean;
  isLoadingNotifications: boolean;
  isLoadingMoreNotifications: boolean;
  pushInAppNotification: (
    input: Omit<InAppNotification, "id" | "userId" | "createdAt"> &
      Partial<Pick<InAppNotification, "createdAt">>
  ) => void;
  markNotificationRead: (id: string, userIdOverride?: string) => void;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  deleteNotification: (id: string) => void;
  requestAndRegisterPushToken: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: "",
  notification: undefined,
  registerTokenWithBackend: async () => {},
  removeTokenFromBackend: async () => {},
  inAppNotifications: [],
  reloadNotifications: async () => {},
  loadMoreNotifications: async () => {},
  hasMoreNotifications: false,
  isLoadingNotifications: false,
  isLoadingMoreNotifications: false,
  pushInAppNotification: () => {},
  markNotificationRead: () => {},
  markAllNotificationsRead: async () => {},
  clearNotifications: async () => {},
  deleteNotification: () => {},
  requestAndRegisterPushToken: async () => {},
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const [expoPushToken, setExpoPushToken] = useState("");
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);
  const [inAppNotifications, setInAppNotifications] = useState<
    InAppNotification[]
  >([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const loadedOnce = useRef(false);

  // Register token with backend when user is authenticated and token is available
  useEffect(() => {
    if (
      user &&
      expoPushToken &&
      !expoPushToken.includes("error")
    ) {
      registerTokenWithBackend();
    }
  }, [user, expoPushToken]);

  const reloadNotifications = async () => {
    if (!user?.uuid) {
      setInAppNotifications([]);
      setHasMoreNotifications(false);
      setNextOffset(0);
      seenNotificationIds.current = new Set();
      loadedOnce.current = false;
      return;
    }
    try {
      setIsLoadingNotifications(true);
      const items = await notificationService.getNotifications(user.uuid, {
        limit: NOTIFICATION_PAGE_SIZE,
        offset: 0,
      });
      if (loadedOnce.current) {
        const newlyAdded = items.filter((item) => !seenNotificationIds.current.has(item.id));
        newlyAdded.slice(0, 3).forEach((item) => {
          if (!TOASTABLE_TYPES.has(item.type)) return;
          showToast({
            title: item.title,
            message: item.message,
            type: toastTypeForNotification(item.type),
            durationMs: 2600,
            skipInApp: true,
          });
        });
      } else {
        loadedOnce.current = true;
      }
      items.forEach((item) => seenNotificationIds.current.add(item.id));
      setInAppNotifications(items);
      setNextOffset(items.length);
      setHasMoreNotifications(
        items.length === NOTIFICATION_PAGE_SIZE &&
          items.length < MAX_IN_APP_NOTIFICATIONS
      );
    } catch (error) {
      console.warn("Failed to load notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    reloadNotifications();
  }, [user?.uuid]);

  const loadMoreNotifications = async () => {
    if (!user?.uuid || isLoadingMoreNotifications || !hasMoreNotifications)
      return;
    try {
      setIsLoadingMoreNotifications(true);
      const startOffset = nextOffset;
      const items = await notificationService.getNotifications(user.uuid, {
        limit: NOTIFICATION_PAGE_SIZE,
        offset: startOffset,
      });
      setInAppNotifications((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        const merged = [...prev, ...items.filter((n) => !existing.has(n.id))];
        return merged.slice(0, MAX_IN_APP_NOTIFICATIONS);
      });
      setNextOffset(startOffset + items.length);
      setHasMoreNotifications(
        items.length === NOTIFICATION_PAGE_SIZE &&
          startOffset + items.length < MAX_IN_APP_NOTIFICATIONS
      );
    } catch (error) {
      console.warn("Failed to load more notifications:", error);
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  };

  // Expose a function to request and register push token on demand
  const requestAndRegisterPushToken = async () => {
    const token = await registerForPushNotificationsAsync();
    setExpoPushToken(token ?? "");
    if (token) {
      await SecureStore.setItemAsync("@expo_push_token", token);
      if (user && !token.includes("error")) {
        await registerTokenWithBackend();
      }
    }
  };

  // Only set up notification listeners on mount
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        const data = (notification.request?.content?.data ?? {}) as Record<string, any>;
        const type = String(data.type || "");
        const notificationId = data.notificationId ? String(data.notificationId) : "";
        if (notificationId) seenNotificationIds.current.add(notificationId);
        if (!TOASTABLE_TYPES.has(type)) return;
        showToast({
          title: notification.request?.content?.title ?? "Update",
          message: notification.request?.content?.body ?? "",
          type: toastTypeForNotification(type),
          durationMs: 2600,
          skipInApp: true,
        });
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const pushInAppNotification = (
    input: Omit<InAppNotification, "id" | "userId" | "createdAt"> &
      Partial<Pick<InAppNotification, "createdAt">>
  ) => {
    if (!input?.message || !input?.title || !user?.uuid) return;
    const userId = user.uuid;
    const optimistic: InAppNotification = {
      id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      userId,
      title: input.title,
      message: input.message,
      type: input.type,
      read: input.read ?? false,
      createdAt: input.createdAt || new Date().toISOString(),
      actionUrl: input.actionUrl,
    };
    setInAppNotifications((prev) => [
      optimistic,
      ...prev,
    ].slice(0, MAX_IN_APP_NOTIFICATIONS));
    notificationService
      .createNotification({
        userId,
        title: input.title,
        message: input.message,
        type: input.type,
        actionUrl: input.actionUrl,
        createdAt: input.createdAt,
      })
      .then((created) => {
        if (!created) return;
        setInAppNotifications((prev) =>
          prev.map((item) => (item.id === optimistic.id ? created : item))
        );
      })
      .catch((error) => {
        console.warn("Failed to create notification:", error);
        setInAppNotifications((prev) =>
          prev.filter((item) => item.id !== optimistic.id)
        );
      });
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      TOAST_CHANNEL,
      (payload: ToastPayload) => {
        if (!payload?.message) return;
        if (payload.skipInApp) return;
        const title = payload.title?.toLowerCase() || "";
        const message = payload.message?.toLowerCase() || "";
        if (payload.type === "success" && (title.includes("achievement") || message.includes("achievement"))) {
          return;
        }
        const type =
          payload.type === "success"
            ? "achievement"
            : payload.type === "error"
              ? "system"
              : "system";
        const notificationTitle =
          payload.title ||
          (payload.type === "success"
            ? "Success"
            : payload.type === "error"
              ? "Error"
              : "Update");
        pushInAppNotification({
          title: notificationTitle,
          message: payload.message,
          type,
          read: false,
        });
      }
    );

    return () => sub.remove();
  }, [user?.id]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CREDIT_EVENT_CHANNEL, () => {
      if (!user?.id) return;
      reloadNotifications();
    });
    return () => sub.remove();
  }, [reloadNotifications, user?.id]);

  const registerTokenWithBackend = async () => {
    if (!user?.uuid || !expoPushToken) return;

    try {
      await notificationService.registerPushToken(user.uuid, expoPushToken);
      console.log("Push token registered with backend for user:", user.uuid);
    } catch (error) {
      console.error("Failed to register push token with backend:", error);
    }
  };

  const removeTokenFromBackend = async () => {
    if (!user?.uuid || !expoPushToken) return;

    try {
      await notificationService.removePushToken(user.uuid, expoPushToken);
      console.log("Push token removed from backend for user:", user.uuid);
    } catch (error) {
      console.error("Failed to remove push token from backend:", error);
    }
  };

  const markNotificationRead = (id: string, userIdOverride?: string) => {
    const userId = userIdOverride || user?.uuid;
    if (!userId) return;
    setInAppNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    notificationService
      .markNotificationRead(userId, id)
      .catch((error) =>
        console.warn("Failed to mark notification read:", error)
      );
  };

  const markAllNotificationsRead = async () => {
    if (!user?.uuid) return;
    const userId = user.uuid;
    setInAppNotifications((prev) =>
      prev.map((item) => (item.read ? item : { ...item, read: true }))
    );
    try {
      await notificationService.markAllNotificationsRead(userId);
    } catch (error) {
      console.warn("Failed to mark all notifications read:", error);
      reloadNotifications();
    }
  };

  const clearNotifications = async () => {
    if (!user?.uuid) return;
    const userId = user.uuid;
    setInAppNotifications([]);
    try {
      await notificationService.clearNotifications(userId);
    } catch (error) {
      console.warn("Failed to clear notifications:", error);
      reloadNotifications();
    }
  };

  const deleteNotification = (id: string) => {
    if (!user?.uuid) return;
    const userId = user.uuid;
    setInAppNotifications((prev) => prev.filter((item) => item.id !== id));
    if (id.startsWith("local_")) return;
    notificationService.deleteNotification(userId, id).catch((error) => {
      console.warn("Failed to delete notification:", error);
      reloadNotifications();
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        registerTokenWithBackend,
        removeTokenFromBackend,
        inAppNotifications,
        reloadNotifications,
        loadMoreNotifications,
        hasMoreNotifications,
        isLoadingNotifications,
        isLoadingMoreNotifications,
        pushInAppNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        deleteNotification,
        requestAndRegisterPushToken,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

// Export a function to remove token on logout (can be called from AuthContext)
export const handleLogoutCleanup = async (
  userId: string,
  pushToken: string
) => {
  if (!userId || !pushToken) return;

  try {
    await notificationService.removePushToken(userId, pushToken);
    console.log("Push token removed from backend on logout");
  } catch (error) {
    console.error("Failed to remove push token on logout:", error);
  }
};
