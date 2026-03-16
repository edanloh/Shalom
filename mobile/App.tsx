// Temporarily commented out AWS Cognito polyfills - switching to Supabase Auth
// import "./polyfills";
import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import * as Font from "expo-font";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import AuthNavigator from "./src/screens/navigation/AuthNavigator";
import MainNavigator from "./src/screens/navigation/MainNavigator";
import NotFoundScreen from "./src/screens/NotFoundScreen";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import UserProvider from "./src/contexts/UserContext";
import CourseProvider from "./src/contexts/CourseContext";
import { NotificationProvider } from "./src/contexts/NotificationContext";
import SplashScreen from "./src/screens/SplashScreen";
import type { RootStackParamList } from "./src/types/navigation";
import * as Linking from "expo-linking";
import { parseSupabaseUrl } from "./src/utils/authUtils";
import { supabase } from "./src/lib/supabase";
import { Colors } from "./src/constants";
import * as Screens from "./src/screens";
import { AppState } from 'react-native';
import { useUser } from "./src/contexts/UserContext";

// Fix for web scrolling - override root height
if (Platform.OS === "web") {
  const style = document.createElement("style");
  style.textContent = `
    body {
      height: 100%;
      overflow: auto;
    }
    /* Hide scrollbar for Chrome, Safari and Opera */
    body::-webkit-scrollbar,
    *::-webkit-scrollbar {
      display: none;
    }
    /* Hide scrollbar for IE, Edge and Firefox */
    body,
    * {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;
  document.head.appendChild(style);
}

// // Tells Supabase Auth to continuously refresh the session automatically if
// // the app is in the foreground. When this is added, you will continue to receive
// // `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// // if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

const Root = createNativeStackNavigator<RootStackParamList>();

// Navigation component that checks auth state
const AppNavigator = () => {
  const { session, isLoading, loginWithToken, user } =
    useAuth();
  const { user: contextUser } = useUser();

  // --- Deep link handling ---
  const getInitialURL = async () => {
    const url = await Linking.getInitialURL();
    if (url !== null) {
      return parseSupabaseUrl(url);
    }
    return url;
  };

  const handleUrl = (url: string) => {
    const transformedUrl = parseSupabaseUrl(url);
    const parsedUrl = Linking.parse(transformedUrl);
    const access_token = parsedUrl.queryParams?.access_token;
    const refresh_token = parsedUrl.queryParams?.refresh_token;
    if (
      typeof access_token === "string" &&
      typeof refresh_token === "string" &&
      parsedUrl.queryParams?.type === "recovery"
    ) {
      void loginWithToken({ access_token, refresh_token, type: parsedUrl.queryParams?.type });
    }
  };

  useEffect(() => {
    (async () => {
      // Check if the app was opened from a deep link
      const url = await getInitialURL();
      if (url) handleUrl(url);
    })();

    // Listen for incoming deep links while the app is open
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.primary,
        }}
      >
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {session && user && contextUser ? (
          <Root.Screen
            name="Main"
            component={MainNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
        <Root.Screen name="ResetPassword" component={Screens.ResetPassword} />
        <Root.Screen name="NotFound" component={NotFoundScreen} />
      </Root.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    Font.loadAsync({
      "PlusJakartaSans-Regular": require("./assets/fonts/PlusJakartaSans-Regular.ttf"),
      "PlusJakartaSans-Medium": require("./assets/fonts/PlusJakartaSans-Medium.ttf"),
      "PlusJakartaSans-SemiBold": require("./assets/fonts/PlusJakartaSans-SemiBold.ttf"),
      "PlusJakartaSans-Bold": require("./assets/fonts/PlusJakartaSans-Bold.ttf"),
      "PlusJakartaSans-ExtraBold": require("./assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    }).then(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return null; // Or a loading spinner
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: showSplash ? Colors.secondary : Colors.primary,
      }}
    >
      <AuthProvider>
        <UserProvider>
          <CourseProvider>
            <NotificationProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                  <StatusBar style="dark" />
                  <AppNavigator />
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </NotificationProvider>
          </CourseProvider>
        </UserProvider>
      </AuthProvider>
    </View>
  );
};

export default App;
