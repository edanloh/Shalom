import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, ContainerStyles, Spacing, Typography, TextStyles } from '../constants';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ActionButton, Screen } from '@/components';

// components (values)
import ProfileHeader from '../components/home/ProfileHeader';
import ProgressSection from '../components/home/ProgressSection';
import CourseCard from '../components/home/CourseCard';

// Import hooks and types
import { useCourses } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import courseService from '../services/courseService';
import creditService from '../services/creditService';
import { showToast } from '@/components/common/Toast';

// types
import type { Course } from '../types';
import CourseCarousel from '@/components/home/CourseCarousel';

// Types for API-ready data structures
interface Achievement {
  id: string;
  icon: string;
  title: string;
  value: string | number;
  color: string;
  type: 'streak' | 'certificate' | 'badge' | 'level';
  navigationTarget?: string;
}

type TabType = 'home' | 'courses' | 'search' | 'settings';

export default function HomeScreen({ navigation, route }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, login, register } = useAuth();
  const [certCount, setCertCount] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [goalProgress, setGoalProgress] = useState<{
    current: number;
    target: number;
    unit: "hours" | "courses" | "points" | "lessons" | "quizzes";
    label: string;
  }>({ current: 0, target: 10, unit: "hours", label: "Weekly Goal" });
  const [goalList, setGoalList] = useState<Array<{
    id: string;
    label: string;
    current: number;
    target: number;
    unit: "hours" | "courses" | "points" | "lessons" | "quizzes";
    deadline?: string;
  }>>([]);

  // const navigation = useNavigation<CompositeNavigationProp<
  //   StackNavigationProp<MainStackParamList>,
  //   BottomTabNavigationProp<TabParamList>
  // >>();

  // Use unified CourseContext for all course data
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    refreshCourses,

    myCourses: myCoursesData,
    myCoursesLoading,
    myCoursesError,
    refreshMyCourses,
    
    recommendedCourses,
    recommendedLoading,
    recommendedError,
    refreshRecommended,

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

  const loadCreditMeta = React.useCallback(async () => {
    try {
      if (!user?.id) {
        setCertCount(0);
        setStreakDays(0);
        return;
      }
      const [certs, goals] = await Promise.all([
        creditService.getCertificates(user.id).catch(() => []),
        creditService.getGoals(user.id).catch(() => []),
      ]);
      creditService.recordGoalMilestones(goals, user?.id);
      setCertCount(Array.isArray(certs) ? certs.length : 0);
      const maxStreak = Array.isArray(goals)
        ? goals.reduce((m, g) => Math.max(m, g.streakDays || 0), 0)
        : 0;
      setStreakDays(maxStreak);
      if (Array.isArray(goals)) {
        const activeGoals = goals.filter((g) => g.isActive && !g.isExpired && !g.completedAt);
        const goal =
          activeGoals[0] ||
          goals.find(
            (g) =>
              Number(g.targetHours || 0) > 0 ||
              Number(g.currentHours || 0) > 0 ||
              Number(g.targetLessons || 0) > 0 ||
              Number(g.currentLessons || 0) > 0 ||
              Number(g.targetQuizzes || 0) > 0 ||
              Number(g.currentQuizzes || 0) > 0 ||
              /study|time/i.test(g.label || "")
          ) ||
          goals[0];

        if (goal) {
          const targetPoints = Number(goal.targetPoints ?? 0);
          const targetCourses = Number(goal.targetCourses ?? 0);
          const targetHours = Number(goal.targetHours ?? 0);
          const targetLessons = Number(goal.targetLessons ?? 0);
          const targetQuizzes = Number(goal.targetQuizzes ?? 0);
          const currentPoints = Number(goal.currentPoints ?? 0);
          const currentCourses = Number(goal.currentCourses ?? 0);
          const currentHours = Number(goal.currentHours ?? 0);
          const currentLessons = Number(goal.currentLessons ?? 0);
          const currentQuizzes = Number(goal.currentQuizzes ?? 0);
          const label = goal.label || "Weekly Goal";

          let unit: "hours" | "courses" | "points" | "lessons" | "quizzes" = "hours";
          if (targetPoints > 0 || currentPoints > 0) unit = "points";
          else if (targetCourses > 0 || currentCourses > 0) unit = "courses";
          else if (targetLessons > 0 || currentLessons > 0) unit = "lessons";
          else if (targetQuizzes > 0 || currentQuizzes > 0) unit = "quizzes";
          else if (targetHours > 0 || currentHours > 0) unit = "hours";
          else if (/course/i.test(label)) unit = "courses";
          else if (/point/i.test(label)) unit = "points";
          else if (/lesson/i.test(label)) unit = "lessons";
          else if (/quiz/i.test(label)) unit = "quizzes";
          else if (/time|study/i.test(label)) unit = "hours";

          const target =
            unit === "points"
              ? targetPoints
              : unit === "courses"
              ? targetCourses
              : unit === "lessons"
              ? targetLessons
              : unit === "quizzes"
              ? targetQuizzes
              : targetHours;
          const current =
            unit === "points"
              ? currentPoints
              : unit === "courses"
              ? currentCourses
              : unit === "lessons"
              ? currentLessons
              : unit === "quizzes"
              ? currentQuizzes
              : currentHours;

          setGoalProgress({
            current,
            target,
            unit,
            label,
          });
        }

        const mappedGoals = activeGoals.map((g) => {
          const targetPoints = Number(g.targetPoints ?? 0);
          const targetCourses = Number(g.targetCourses ?? 0);
          const targetHours = Number(g.targetHours ?? 0);
          const targetLessons = Number(g.targetLessons ?? 0);
          const targetQuizzes = Number(g.targetQuizzes ?? 0);
          const currentPoints = Number(g.currentPoints ?? 0);
          const currentCourses = Number(g.currentCourses ?? 0);
          const currentHours = Number(g.currentHours ?? 0);
          const currentLessons = Number(g.currentLessons ?? 0);
          const currentQuizzes = Number(g.currentQuizzes ?? 0);
          const label = g.label || "Goal";

          let unit: "hours" | "courses" | "points" | "lessons" | "quizzes" = "hours";
          if (targetPoints > 0 || currentPoints > 0) unit = "points";
          else if (targetCourses > 0 || currentCourses > 0) unit = "courses";
          else if (targetLessons > 0 || currentLessons > 0) unit = "lessons";
          else if (targetQuizzes > 0 || currentQuizzes > 0) unit = "quizzes";
          else if (targetHours > 0 || currentHours > 0) unit = "hours";
          else if (/course/i.test(label)) unit = "courses";
          else if (/point/i.test(label)) unit = "points";
          else if (/lesson/i.test(label)) unit = "lessons";
          else if (/quiz/i.test(label)) unit = "quizzes";
          else if (/time|study/i.test(label)) unit = "hours";

          const target =
            unit === "points"
              ? targetPoints
              : unit === "courses"
              ? targetCourses
              : unit === "lessons"
              ? targetLessons
              : unit === "quizzes"
              ? targetQuizzes
              : targetHours;
          const current =
            unit === "points"
              ? currentPoints
              : unit === "courses"
              ? currentCourses
              : unit === "lessons"
              ? currentLessons
              : unit === "quizzes"
              ? currentQuizzes
              : currentHours;

          return {
            id: String(g.id || label),
            label,
            current,
            target,
            unit,
            deadline: g.deadline,
          };
        });
        const sortedGoals = mappedGoals.sort((a, b) => {
          const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
          const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
          if (aDeadline !== bDeadline) return aDeadline - bDeadline;
          const aProgress = a.target > 0 ? a.current / a.target : 0;
          const bProgress = b.target > 0 ? b.current / b.target : 0;
          if (aProgress !== bProgress) return bProgress - aProgress;
          return a.label.localeCompare(b.label);
        });
        setGoalList(sortedGoals);
      } else {
        setGoalList([]);
      }
    } catch (err) {
      console.warn('Home: failed to load credit stats', err);
      setGoalList([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCreditMeta();
    const unsub = creditService.subscribeToCreditUpdates(loadCreditMeta);
    return () => {
      if (unsub) unsub();
    };
  }, [loadCreditMeta]);

  useFocusEffect(
    React.useCallback(() => {
      loadCreditMeta();
    }, [loadCreditMeta])
  );

  // Mock static data that doesn't require API calls
  const achievements: Achievement[] = [
    {
      id: '1',
      icon: 'flame',
      title: 'Day Streak',
      value: streakDays || 0,
      color: Colors.streakCardBg,
      type: 'streak',
      navigationTarget: 'LearningGoalScreen',
    },
    {
      id: '2',
      icon: 'trophy',
      title: 'Certificates',  
      value: certCount,
      color: Colors.certificateCardBg,
      type: 'certificate',
      navigationTarget: 'CertificatesScreen',
    },
  ];

  // Handle refresh for all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshCourses?.(),
        refreshMyCourses(),
        refreshRecommended(),
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
    if (recommendedError) {
      handleError(recommendedError, refreshRecommended, 'Recommended Courses');
    }
  }, [recommendedError]);

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


  const handleRecommendationClick = async (course: Course) => {
    if (user?.id) {
      courseService.recordRecommendationEvent({
        userId: user.id,
        courseId: course.id,
        eventType: 'click',
        requestId: course.recommendationRequestId,
        context: {
          placement: 'home_recommended',
          isRecommendationSurface: true,
          modelVersion: course.recommendationModelVersion,
          requestId: course.recommendationRequestId,
        },
      }).catch((err) => console.warn('Failed to record rec click', err));
    }
    navigation.navigate('CourseDetail', { courseId: course.id });
  };

  const handleWishlistCourseClick = async (course: Course) => {
    if (user?.id) {
      courseService.recordRecommendationEvent({
        userId: user.id,
        courseId: course.id,
        eventType: 'click',
        context: {
          placement: 'wishlist',
          isRecommendationSurface: false,
        },
      }).catch((err) => console.warn('Failed to record wishlist click', err));
    }
    navigation.navigate('CourseDetail', { courseId: course.id });
  };

  // Build recommended list: prefer API recs, fallback to non-enrolled
  const recommendedList = React.useMemo(() => {
    if (recommendedCourses?.length) return recommendedCourses;
    const enrolledIds = new Set((myCoursesData ?? []).map((c) => c.id));
    return (courses ?? []).filter((c) => !enrolledIds.has(c.id)).slice(0, 8);
  }, [courses, myCoursesData, recommendedCourses]);

  const recommendedListLoading = recommendedLoading || coursesLoading;

  useEffect(() => {
    if (user?.id && recommendedList.length > 0) {
      const firstRecommendation = recommendedList[0];
      courseService.recordRecommendationEvent({
        userId: user.id,
        eventType: 'impression',
        requestId: firstRecommendation?.recommendationRequestId,
        context: {
          placement: 'home_recommended',
          isRecommendationSurface: true,
          courseIds: recommendedList.map((c) => c.id),
          modelVersion: firstRecommendation?.recommendationModelVersion,
          requestId: firstRecommendation?.recommendationRequestId,
        },
      }).catch((err) => console.warn('Failed to record rec impression', err));
    }
  }, [user?.id, recommendedList]);

  const getTop10Courses = (courses: Course[]): Course[] => {
    // Return top 10 courses - already sorted by last_activity_at from API
    // Do NOT re-sort here to preserve the most recently active order
    return courses.slice(0, 10);
  }

  // Handle user loading state
  if (!user) {
    return (
      <Screen
        title=""
        noHeader
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple400} />
          <Text style={styles.loadingText}>Loading user profile...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title=""
      noHeader
      widescreen
      customEdges={["top"]}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
    >
      {/* Combined Header with Profile, Welcome, and Notifications */}
      <ProfileHeader 
        user={user}
        hasNotifications={true}
        onNotificationPress={handleNotificationPress}
      />

          {/* Achievement Cards - Day Streak and Certificates */}
          <ProgressSection
            achievements={achievements}
            current={goalProgress.current}
            target={goalProgress.target || 10}
            unit={goalProgress.unit}
            label={goalProgress.label}
            goals={goalList}
            navigation={navigation}
          />        

          {/* My Courses Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4]}>
                My Courses
              </Text>
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
              <>
              <CourseCarousel
                courses={getTop10Courses(myCoursesData)}
                onToggleWishlist={toggleWishlist}
                isWishlisted={(id) => isWishlisted?.(id) ?? false}
              />
            </>
            )}
          </View>

          {/* Wishlist Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4]}>
                Wishlist
              </Text>
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
                    showRecommendationReason={false}
                    onPress={(c) => handleWishlistCourseClick(c)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* Suggested Courses Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4]}>
                Recommended for You
              </Text>
            </View>

            {recommendedListLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.purple400} />
                <Text style={styles.loadingText}>Loading suggestions...</Text>
              </View>
            ) : recommendedError || coursesError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{recommendedError || coursesError}</Text>
                <TouchableOpacity onPress={refreshRecommended} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: Spacing.lg, paddingRight: Spacing.base }}
              >
                {recommendedList.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    variant="compact"
                    showInstructor={false}
                    onPress={(c) => handleRecommendationClick(c)}
                  />
                ))}
              </ScrollView>
            )}
        </View>
        <View style={{ height: 130 }} />

      {/* Bottom Navigation - Home, My Courses, Search, Settings */}
      {/* <BottomNavigation 
        activeTab={activeTab}
        onTabPress={handleTabPress}
      /> */}
    </Screen>
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
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h3.fontSize,
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 13,
    color: "#C4B5FD",
    fontWeight: "600",
    marginBottom: Spacing.sm,
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
