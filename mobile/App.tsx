import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import * as Font from "expo-font";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AuthNavigator from "./src/screens/navigation/AuthNavigator";
import MainNavigator from "./src/screens/navigation/MainNavigator";
import NotFoundScreen from "./src/screens/NotFoundScreen";
import { AuthProvider } from "./src/contexts/AuthContext";
import { UserProvider } from "./src/contexts/UserContext";
import { CourseProvider } from "./src/contexts/CourseContext";
import SplashScreen from "./src/screens/SplashScreen";

export type RootStackParamList = {
  Auth: undefined;
  MainScreens: undefined;
  NotFound: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    Font.loadAsync({
      "Lexend-Regular": require("@assets/fonts/Lexend-Regular.ttf"),
      "Lexend-Light": require("@assets/fonts/Lexend-Light.ttf"),
      // Add other Lexend font weights/styles here if needed
    }).then(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) {
    return null; // Or a loading spinner
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProvider>
          <CourseProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <StatusBar style="dark" />
                <NavigationContainer>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {/* <Stack.Screen name="Auth" component={AuthNavigator} /> */}
                    <Stack.Screen name="MainScreens" component={MainNavigator} options={{ headerShown: false }} />
                    <Stack.Screen name="NotFound" component={NotFoundScreen} />
                  </Stack.Navigator>
                </NavigationContainer>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </CourseProvider>
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
