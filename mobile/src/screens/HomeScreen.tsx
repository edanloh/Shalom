import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, ContainerStyles, Spacing, Typography, TextStyles } from '../constants';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

// components (values)
import ProfileHeader from '../components/home/ProfileHeader';
import ProgressSection from '../components/home/ProgressSection';
import SwipeableCourseCards from '../components/home/SwipeableCourseCards';
import CourseCard from '../components/home/CourseCard';

// Import hooks and types
import { useCourses } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';

// types
import type { Course } from '../types';
import type { MainStackParamList, TabParamList } from '../types/navigation';

// Types for API-ready data structures
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

    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    toggleWishlist,
    isWishlisted,
  } = useCourses();

  // Debug logging for user state
  useEffect(() => {
    console.log('HomeScreen - Current user from AuthContext:', user);
    if (user) {
      console.log('HomeScreen - User ID for enrollment fetch:', user.id);
    }
  }, [user]);

  // Mock static data that doesn't require API calls
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
    userId: '550e8400-e29b-41d4-a716-446655440101',
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

  const handleViewWishlist = () => {
    // Navigate to wishlist screen
    navigation.navigate('Wishlist');
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

  // Handle user loading state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple400} />
          <Text style={styles.loadingText}>Loading user profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
          user={user}
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
          ) : (myCoursesData?.length ?? 0) === 0 ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>You haven't enrolled in any courses yet.</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Courses')}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Browse courses</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SwipeableCourseCards 
              courses={myCoursesData}
              onCourseComplete={handleCourseComplete}
              onCourseLike={handleCourseLike}
              onToggleWishlist={toggleWishlist}
              isWishlisted={(id) => isWishlisted?.(id) ?? false}
            />
          )}
        </View>

        {/* Wishlist Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wishlist</Text>
            <TouchableOpacity onPress={handleViewWishlist}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {wishlistLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.purple400} />
              <Text style={styles.loadingText}>Loading wishlist...</Text>
            </View>
          ) : wishlistError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{wishlistError}</Text>
              <TouchableOpacity onPress={refreshWishlist} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : wishlist.length === 0 ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>You haven't added any courses into your wishlist yet.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: Spacing.lg, paddingRight: Spacing.base }}
            >
              {wishlist.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="compact"
                  showInstructor={false}
                  onPress={(c) => navigation.navigate('CourseDetail', { courseId: c.id })}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Suggested Courses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested for You</Text>
          </View>

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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: Spacing.lg, paddingRight: Spacing.base }}
            >
              {suggestedCoursesData.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  variant="compact"
                  showInstructor={false}
                  onPress={(c) => navigation.navigate('CourseDetail', { courseId: c.id })}
                />
              ))}
            </ScrollView>
          )}
          </View>
          <View style={{ height: 120 }} />
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
