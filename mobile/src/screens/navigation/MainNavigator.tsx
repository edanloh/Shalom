import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { ADMIN_EMAIL, Colors } from '../../constants';
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
            // case "Admin":
            //   iconName = focused ? "people" : "people-outline";
            //   break;
            default:
              iconName = "ellipse";
          }

          // Wrap icon in rounded background when focused
          if (focused) {
            return (
              <View style={styles.activeIconContainer}>
                <Ionicons
                  name={iconName}
                  size={size}
                  color={Colors.secondary}
                />
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.white,
        tabBarInactiveTintColor: Colors.white,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 6,
        },
        tabBarBackground: () => (
          <>
            <LinearGradient
              colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.45)"]}
              locations={[0, 0.2]}
              style={styles.tabBarBackground}
              pointerEvents="auto"
            />
            <View style={styles.tabBar} />
          </>
        ),
        tabBarStyle: {
          backgroundColor: Colors.secondary,
          borderTopColor: "transparent",
          position: "absolute",
          bottom: 45,
          elevation: 1,
          borderRadius: 40,
          height: 74,
          paddingBottom: 0,
          paddingTop: 10,
          borderWidth: 0,
          marginHorizontal: 10,
        },
        tabBarLabelPosition: "below-icon",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* {user?.email === ADMIN_EMAIL && (
        <Tab.Screen name="Admin" component={UserManagementScreen} />
      )} */}
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

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBarBackground: {
    position: "absolute",
    top: -30,
    bottom: -45,
    left: -20,
    right: -20,
    zIndex: 0,
  },
  tabBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    borderRadius: 40,
    zIndex: 1,
  },
});
