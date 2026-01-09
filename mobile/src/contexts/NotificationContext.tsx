import React, { createContext, useState, useEffect, useContext } from "react";
import { Platform, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuth } from "./AuthContext";
import notificationService from "../services/notificationService";

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
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: "",
  notification: undefined,
  registerTokenWithBackend: async () => {},
  removeTokenFromBackend: async () => {},
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

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        registerTokenWithBackend,
        removeTokenFromBackend,
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
