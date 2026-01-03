import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../HomeScreen';
import CoursesScreen from '../Courses';
import ProfileScreen from '../UserProfile';
import CourseDetailScreen from '../CourseDetailScreen';
import ModuleDetailScreen from '../ModuleDetailScreen';
import LessonPlayer from '../LessonPlayer';
import QuizScreen from '../QuizScreen';
import NotificationsScreen from '../Notification';
import SettingsScreen from '../Settings';
import EditProfileScreen from '../EditProfile';
import MyCourses from '../MyCourses';
import WishlistScreen from '../WishlistScreen';
import LeaveReviewScreen from '../LeaveReviewScreen';
import UserManagementScreen from '../admin/UserManagement';
import UserConfigScreen from '../admin/UserConfig';
import { useAuth } from '../../contexts/AuthContext';
import type { TabParamList, MainStackParamList } from '@/types/navigation';
import { ADMIN_EMAIL } from '../../constants';
import TestScreen from '../TestScreen';
import SearchScreen from '../[unused] Search';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

function TabNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
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
            case "Admin":
              iconName = focused ? "people" : "people-outline";
              break;
            default:
              iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
        // headerStyle: { backgroundColor: '#8B5CF6' },
        // headerTintColor: '#fff',
        // headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen}/>
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {user?.email === ADMIN_EMAIL && (
        <Tab.Screen name="Admin" component={UserManagementScreen} />
      )}
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ModuleDetail"
        component={ModuleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LessonPlayer"
        component={LessonPlayer}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QuizScreen"
        component={QuizScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserConfig"
        component={UserConfigScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyCourses"
        component={MyCourses}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeaveReview"
        component={LeaveReviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TestScreen"
        component={TestScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
