import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, ContainerStyles, Spacing, Typography, TextStyles } from '../constants';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

// components (values)
import ProfileHeader from '../components/home/ProfileHeader';
import ProgressSection from '../components/home/ProgressSection';
import SwipeableCourseCards from '../components/home/SwipeableCourseCards';
import SuggestedCourses from '../components/home/SuggestedCourses';

// Import hooks and types
import { useCourses } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';

// types
import type { Course } from '../types';
import type { MainStackParamList, TabParamList } from '../types/navigation';

// Types for API-ready data structures
interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
  email: string;
  joinedAt: string;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  value: string | number;
  color: string;
  type: 'streak' | 'certificate' | 'badge' | 'level';
}

interface WeeklyGoalData {
  id: string;
  userId: string;
  targetHours: number;
  currentHours: number;
  weekStartDate: string;
  weekEndDate: string;
}

type TabType = 'home' | 'courses' | 'search' | 'settings';

const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, login, register } = useAuth();

  // Auto-login for testing if no user is authenticated
  useEffect(() => {
    if (!user) {
      console.log('No user found, auto-registering test user...');
      // Use register to get the correct user ID (550e8400-e29b-41d4-a716-446655440101)
      register('test@example.com', 'password', 'Test User', 'learner');
    }
  }, [user, register]);

  // Use unified CourseContext for all course data

  const navigation = useNavigation<CompositeNavigationProp<
    StackNavigationProp<MainStackParamList>,
    BottomTabNavigationProp<TabParamList>
  >>();

  // Use unified CourseContext for all course data
  const {
    myCourses: myCoursesData,
    myCoursesLoading,
    myCoursesError,
    refreshMyCourses,
    
    suggestedCourses: suggestedCoursesData,
    suggestedLoading,
    suggestedError,
    refreshSuggested,
  } = useCourses();

  // Debug logging for user state
  useEffect(() => {
    console.log('HomeScreen - Current user:', user);
    if (user) {
      console.log('HomeScreen - User ID for enrollment fetch:', user.id);
    }
    // REMOVE LATER - Temporary override for testing
    if (user) {
      user.id = '550e8400-e29b-41d4-a716-446655440101'; // Temporary override for testing
    }
  }, [user]);

  // Mock static data that doesn't require API calls
  const userData: User = {
    id: '1',
    name: 'James Lee',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face',
    points: 30,
    email: 'james.lee@example.com',
    joinedAt: '2024-01-15T00:00:00Z',
  };

  const achievements: Achievement[] = [
    {
      id: '1',
      icon: 'flame',
      title: 'Day Streak',
      value: 12,
      color: Colors.streakCardBg,
      type: 'streak',
    },
    {
      id: '2',
      icon: 'trophy',
      title: 'Certificates',  
      value: 3,
      color: Colors.certificateCardBg,
      type: 'certificate',
    },
  ];

  const weeklyGoal: WeeklyGoalData = {
    id: '1',
    userId: '550e8400-e29b-41d4-a716-446655440102',
    targetHours: 7,
    currentHours: 5.8,
    weekStartDate: '2024-12-02T00:00:00Z',
    weekEndDate: '2024-12-08T23:59:59Z',
  };

  // Handle refresh for all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshMyCourses(),
        refreshSuggested(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle errors with user-friendly messages
  const handleError = (error: string | null, retryFunction: () => Promise<void>, errorType: string) => {
    if (error) {
      Alert.alert(
        `${errorType} Error`,
        error,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: retryFunction },
        ]
      );
    }
  };

  // Check for errors on mount and when errors change
  useEffect(() => {
    if (myCoursesError) {
      handleError(myCoursesError, refreshMyCourses, 'My Courses');
    }
  }, [myCoursesError]);

  useEffect(() => {
    if (suggestedError) {
      handleError(suggestedError, refreshSuggested, 'Suggested Courses');
    }
  }, [suggestedError]);

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleNotificationPress = () => {
    // Handle notification press - integrate with notification system
    navigation.navigate('Notifications');
  };

  const handleViewAllCourses = () => {
    // Navigate to my courses screen
    navigation.navigate('MyCourses');
  };

  // Handle course actions for swipeable cards
  const handleCourseComplete = (courseId: string) => {
    console.log('Course marked as completed:', courseId);
    // TODO: Update course completion status via API
  };

  const handleCourseLike = (courseId: string) => {
    console.log('Course liked/continued:', courseId);
    // TODO: Update course like status or mark as in-progress via API
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.white}
            colors={[Colors.purple400]}
          />
        }
      >
        {/* Combined Header with Profile, Welcome, and Notifications */}
        <ProfileHeader 
          user={userData}
          hasNotifications={true}
          onNotificationPress={handleNotificationPress}
        />

        {/* Achievement Cards - Day Streak and Certificates */}
        <ProgressSection achievements={achievements} currentHours={0} targetHours={10} />        

        {/* My Courses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Courses</Text>
            <TouchableOpacity onPress={handleViewAllCourses}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {myCoursesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.purple400} />
              <Text style={styles.loadingText}>Loading your courses...</Text>
            </View>
          ) : myCoursesError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{myCoursesError}</Text>
              <TouchableOpacity onPress={refreshMyCourses} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SwipeableCourseCards 
              courses={myCoursesData}
              onCourseComplete={handleCourseComplete}
              onCourseLike={handleCourseLike}
            />
          )}
        </View>

        {/* Suggested Courses Section */}
        {suggestedLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.purple400} />
            <Text style={styles.loadingText}>Loading suggestions...</Text>
          </View>
        ) : suggestedError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{suggestedError}</Text>
            <TouchableOpacity onPress={refreshSuggested} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SuggestedCourses courses={suggestedCoursesData} />
        )}
      </ScrollView>

      {/* Bottom Navigation - Home, My Courses, Search, Settings */}
      {/* <BottomNavigation 
        activeTab={activeTab}
        onTabPress={handleTabPress}
      /> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...ContainerStyles.screen,
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h3.fontSize,
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.purple400,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    minHeight: 200,
  },
  errorText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default HomeScreen;
