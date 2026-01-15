import { View, StyleSheet, Platform, Dimensions, DeviceEventEmitter } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBar, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useNavigationState } from "@react-navigation/native";

// Screens
import * as Screens from "../index";

import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import type { TabParamList, MainStackParamList } from "@/types/navigation";
import { ADMIN_EMAIL, Colors } from "../../constants";
import { BlurView } from "expo-blur";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const tabBarBottomOffset = Platform.OS === "android" ? 50 : 20;
const TAB_BAR_HEIGHT = 74;
const TAB_BAR_HIDE_TRANSLATE = tabBarBottomOffset + TAB_BAR_HEIGHT + 20;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Tab routes mapping to indices
const TAB_ROUTES = ["Home", "Courses", "Notifications", "Profile"];

function TabNavigator() {
  const { user } = useAuth();
  const { inAppNotifications } = useNotification();
  const activeTabIndex = useSharedValue(0);
  const tabBarTranslateY = useSharedValue(0);
  const hasUnread = inAppNotifications.some((item) => !item.read);

  // Get the current route index from navigation state
  const currentTabIndex = useNavigationState((state) => {
    if (!state) return 0;
    const tabState = state.routes.find(
      (route) => route.name === "MainTabs"
    )?.state;
    return tabState?.index ?? 0;
  });

  // Update the shared value when tab changes
  useEffect(() => {
    activeTabIndex.value = currentTabIndex;
  }, [currentTabIndex]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("tabbar:toggle", (payload: { visible: boolean }) => {
      if (typeof payload?.visible !== "boolean") return;
      tabBarTranslateY.value = withTiming(payload.visible ? 0 : TAB_BAR_HIDE_TRANSLATE, {
        duration: 220,
      });
    });
    return () => sub.remove();
  }, []);

  // Calculate the position for the sliding white circle
  const tabWidth = (SCREEN_WIDTH - 20) / 4 - 0.3; // 4 tabs, minus margins

  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(activeTabIndex.value * tabWidth, {
            damping: 130,
            stiffness: 2000,
          }),
        },
      ],
    };
  });

  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: tabBarTranslateY.value }],
    };
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = 22; // Custom icon size
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Courses":
              iconName = focused ? "library" : "library-outline";
              break;
            case "Notifications":
              iconName = focused ? "notifications" : "notifications-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            // case "Admin":
            //   iconName = focused ? "people" : "people-outline";
            //   break;
            default:
              iconName = "ellipse";
          }

          return (
            <View style={[
              styles.iconWrapper,
              !focused && styles.inactiveIconCircle
            ]}>
              <Ionicons
                name={iconName}
                size={iconSize}
                color={focused ? Colors.secondary : Colors.white}
              />
              {route.name === "Notifications" && hasUnread ? (
                <View style={styles.unreadDot} />
              ) : null}
            </View>
          );
        },
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: Colors.white,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 7,
        },
        tabBarBackground: () => (
          <>
            <View style={styles.tabBarBackground}>
              <BlurView
                intensity={20}
                tint="dark"
                style={StyleSheet.absoluteFill}
                experimentalBlurMethod="dimezisBlurView"
                blurReductionFactor={8}
              />
              <LinearGradient
                colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                locations={[0, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.tabBar}>
              {/* Sliding white circle indicator */}
              <Animated.View
                style={[
                  styles.slidingCircle,
                  animatedCircleStyle,
                  { width: tabWidth },
                ]}
              >
                <View style={styles.iconContainer} />
              </Animated.View>
            </View>
          </>
        ),
        tabBarStyle: {
          backgroundColor: Colors.secondary,
          borderTopColor: "transparent",
          position: "absolute",
          bottom: tabBarBottomOffset,
          elevation: 1,
          borderRadius: 40,
          height: TAB_BAR_HEIGHT,
          paddingBottom: 0,
          paddingTop: 10,
          borderWidth: 0,
          marginHorizontal: 10,
        },
        tabBarLabelPosition: "below-icon",
      })}
      tabBar={(props) => (
        <Animated.View style={tabBarAnimatedStyle}>
          <BottomTabBar {...props} />
        </Animated.View>
      )}
    >
      <Tab.Screen name="Home" component={Screens.HomeScreen} />
      <Tab.Screen name="Courses" component={Screens.CoursesScreen} />
      <Tab.Screen name="Notifications" component={Screens.Notification} />
      <Tab.Screen name="Profile" component={Screens.UserProfile} />
      {/* {user?.email === ADMIN_EMAIL && (
        <Tab.Screen name="Admin" component={UserManagementScreen} />
      )} */}
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  const { isResettingPassword } = useAuth();
  return (
    <Stack.Navigator
      initialRouteName={isResettingPassword ? "ResetPassword" : "MainTabs"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourseDetail"
        component={Screens.CourseDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ModuleDetail"
        component={Screens.ModuleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LessonPlayer"
        component={Screens.LessonPlayer}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuizScreen"
        component={Screens.QuizScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={Screens.Settings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={Screens.EditProfile}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserManagement"
        component={Screens.UserManagement}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserConfig"
        component={Screens.UserConfig}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyCourses"
        component={Screens.MyCourses}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Wishlist"
        component={Screens.WishlistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeaveReview"
        component={Screens.LeaveReviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TestScreen"
        component={Screens.TestScreen}
        options={{ headerShown: false }}
      />
      {/* <Stack.Screen
        name="SearchScreen"
        component={Screens.SearchScreen}
        options={{ headerShown: false }}
      /> */}
      <Stack.Screen
        name="PointsHistory"
        component={Screens.PointsHistory}
        options={{ headerShown: false }}
      />
      {/* <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      /> */}
      <Stack.Screen
        name="AchievementsScreen"
        component={Screens.AchievementsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CertificatesScreen"
        component={Screens.CertificatesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PDFView"
        component={Screens.PDFView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LearningGoalScreen"
        component={Screens.LearningGoalScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={Screens.ChangePassword}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={Screens.ResetPassword}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  unreadDot: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.notificationRed,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  inactiveIconCircle: {
    backgroundColor: "rgba(58, 51, 159, 0.4)",
    borderRadius: 20,
  },
  slidingCircle: {
    position: "absolute",
    top: 10,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  tabBarBackground: {
    position: "absolute",
    top: -15,
    bottom: -tabBarBottomOffset - 1,
    left: -10,
    right: -10,
    zIndex: 0,
    overflow: "hidden",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 0.5,
  },
  tabBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 0.5,
    borderRadius: 40,
    zIndex: 1,
  },
});
