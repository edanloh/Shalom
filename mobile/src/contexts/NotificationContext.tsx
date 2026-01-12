import React, { createContext, useState, useEffect, useContext } from "react";
import { Platform, Alert, DeviceEventEmitter } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuth } from "./AuthContext";
import notificationService from "../services/notificationService";
import { CREDIT_EVENT_CHANNEL } from "../services/creditService";
import { TOAST_CHANNEL, type ToastPayload } from "../components/common/Toast";
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
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
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
    if (!user?.id) {
      setInAppNotifications([]);
      setHasMoreNotifications(false);
      setNextOffset(0);
      return;
    }
    try {
      setIsLoadingNotifications(true);
      const items = await notificationService.getNotifications(user.id, {
        limit: NOTIFICATION_PAGE_SIZE,
        offset: 0,
      });
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
  }, [user?.id]);

  const loadMoreNotifications = async () => {
    if (!user?.id || isLoadingMoreNotifications || !hasMoreNotifications) return;
    try {
      setIsLoadingMoreNotifications(true);
      const startOffset = nextOffset;
      const items = await notificationService.getNotifications(user.id, {
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

  // Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(async (token) => {
        setExpoPushToken(token ?? "");
        // Store token in SecureStore for logout cleanup
        if (token) {
          await SecureStore.setItemAsync("@expo_push_token", token);
        }
      })
      .catch((error: any) => setExpoPushToken(`${error}`));

    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
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
    if (!input?.message || !input?.title || !user?.id) return;
    const userId = user.id;
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
    if (!user?.id || !expoPushToken) return;

    try {
      await notificationService.registerPushToken(user.id, expoPushToken);
      console.log("Push token registered with backend for user:", user.id);
    } catch (error) {
      console.error("Failed to register push token with backend:", error);
    }
  };

  const removeTokenFromBackend = async () => {
    if (!user?.id || !expoPushToken) return;

    try {
      await notificationService.removePushToken(user.id, expoPushToken);
      console.log("Push token removed from backend for user:", user.id);
    } catch (error) {
      console.error("Failed to remove push token from backend:", error);
    }
  };

  const markNotificationRead = (id: string, userIdOverride?: string) => {
    const userId = userIdOverride || user?.id;
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
    if (!user?.id) return;
    const userId = user.id;
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
    if (!user?.id) return;
    const userId = user.id;
    setInAppNotifications([]);
    try {
      await notificationService.clearNotifications(userId);
    } catch (error) {
      console.warn("Failed to clear notifications:", error);
      reloadNotifications();
    }
  };

  const deleteNotification = (id: string) => {
    if (!user?.id) return;
    const userId = user.id;
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
