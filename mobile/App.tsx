// Temporarily commented out AWS Cognito polyfills - switching to Supabase Auth
// import "./polyfills";
import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import * as Font from "expo-font";
import { NavigationContainer } from "@react-navigation/native";
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
import type { MainStackParamList } from "./src/types";

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

const Stack = createNativeStackNavigator<MainStackParamList>();

// Navigation component that checks auth state
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen
            name="Main"
            component={MainNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
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
  );
};

export default App;
