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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, ContainerStyles, Spacing, Typography, TextStyles } from '../constants';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, Screen } from '@/components';

// components (values)
import ProfileHeader from '../components/home/ProfileHeader';
import ProgressSection from '../components/home/ProgressSection';
import CourseCard from '../components/home/CourseCard';
import InterestSelectionModal from '../components/home/InterestSelectionModal';
import { PREFERRED_CATEGORIES_KEY } from '../contexts/CourseContext';

// Import hooks and types
import { useCourses } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import courseService from '../services/courseService';
import creditService from '../services/creditService';
import type { ShopItem } from '../services/creditService';
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
  const { user: profileUser } = useUser();
  const recommendationUserId = profileUser?.uuid;
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [equippedTitle, setEquippedTitle] = useState<ShopItem | null>(null);
  const [equippedFrame, setEquippedFrame] = useState<ShopItem | null>(null);
  const [equippedBanner, setEquippedBanner] = useState<ShopItem | null>(null);
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
    dismissedRecommendationIds,
    dismissRecommendedCourse,

    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    toggleWishlist,
    isWishlisted,
    recordRecommendationEvent,
  } = useCourses();

  // Debug logging for user state
  useEffect(() => {
    console.log('HomeScreen - Current user from AuthContext:', user);
    if (profileUser) {
      console.log('HomeScreen - DB User ID for enrollment fetch:', profileUser.uuid);
    }
  }, [profileUser]);

  // Show interest selection modal for cold-start users (no enrolled courses,
  // and haven't been shown the modal before).
  useEffect(() => {
    if (!profileUser?.uuid || myCoursesLoading) return;
    if ((myCoursesData ?? []).length > 0) return; // already has history
    const key = `interests_prompted_${profileUser.uuid}`;
    AsyncStorage.getItem(key).then(val => {
      if (!val) setShowInterestModal(true);
    });
  }, [myCoursesData?.length, myCoursesLoading, profileUser?.uuid]);

  const handleInterestConfirm = async (selected: string[]) => {
    if (profileUser?.uuid) {
      await AsyncStorage.setItem(`${PREFERRED_CATEGORIES_KEY}_${profileUser.uuid}`, JSON.stringify(selected));
      await AsyncStorage.setItem(`interests_prompted_${profileUser.uuid}`, 'confirmed');
    }
    setShowInterestModal(false);
    refreshRecommended();
  };

  const handleInterestSkip = async () => {
    if (profileUser?.uuid) {
      await AsyncStorage.setItem(`interests_prompted_${profileUser.uuid}`, 'skipped');
    }
    setShowInterestModal(false);
  };

  const loadCreditMeta = React.useCallback(async () => {
    try {
      if (!profileUser?.uuid) {
        setCreditBalance(0);
        setEquippedTitle(null);
        setEquippedFrame(null);
        setEquippedBanner(null);
        setCertCount(0);
        setStreakDays(0);
        return;
      }
      const [balanceResult, certs, goalStats, shopResult] = await Promise.all([
        creditService.getCreditBalance(profileUser.uuid).catch(() => null),
        creditService.getCertificates(profileUser.uuid).catch(() => []),
        creditService.getGoalsWithProgress(profileUser.uuid).catch(() => ({
          goals: [],
          completedCourses: 0,
          totalTimeMinutes: 0,
          streakDays: 0,
        })),
        creditService.getShopItems(profileUser.uuid).catch(() => ({ items: [], balance: 0 })),
      ]);
      creditService.recordDailyLogin(profileUser.uuid);
      setCreditBalance(Number(balanceResult?.balance ?? 0));
      const activeTitle = (shopResult.items ?? []).find((item) => item.type === 'title' && item.isEquipped);
      const activeFrame = (shopResult.items ?? []).find((item) => item.type === 'avatar_frame' && item.isEquipped);
      const activeBanner = (shopResult.items ?? []).find((item) => item.type === 'profile_banner' && item.isEquipped);
      setEquippedTitle(activeTitle ?? null);
      setEquippedFrame(activeFrame ?? null);
      setEquippedBanner(activeBanner ?? null);
      const goals = Array.isArray(goalStats?.goals) ? goalStats.goals : [];
      setCertCount(Array.isArray(certs) ? certs.length : 0);
      const maxGoalStreak = Array.isArray(goals)
        ? goals.reduce((m, g) => Math.max(m, g.streakDays || 0), 0)
        : 0;
      setStreakDays(Math.max(Number(goalStats?.streakDays ?? 0), maxGoalStreak));
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
      setCreditBalance(0);
      setEquippedTitle(null);
      setEquippedFrame(null);
      setEquippedBanner(null);
      setGoalList([]);
    }
  }, [profileUser?.uuid]);

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

  const handleViewAllCourses = () => {
    // Navigate to my courses screen
    navigation.navigate('MyCourses');
  };

  const handleViewWishlist = () => {
    // Navigate to wishlist screen
    navigation.navigate('Wishlist');
  };


  const handleRecommendationClick = async (course: Course) => {
    recordRecommendationEvent(course.id, 'click', 'home_recommended')
      .catch((err) => console.warn('Failed to record rec click', err));
    navigation.navigate('CourseDetail', { courseId: course.id });
  };

  const handleRecommendationDismiss = (course: Course) => {
    dismissRecommendedCourse(course, 'home_recommended')
      .catch((err) => console.warn('Failed to record rec dismiss', err));
  };

  const handleWishlistCourseClick = async (course: Course) => {
    recordRecommendationEvent(course.id, 'click', 'wishlist')
      .catch((err) => console.warn('Failed to record wishlist click', err));
    navigation.navigate('CourseDetail', { courseId: course.id });
  };

  // Build recommended list: prefer API recs, fallback to non-enrolled, exclude dismissed
  const recommendedList = React.useMemo(() => {
    const enrolledIds = new Set((myCoursesData ?? []).map((c) => c.id));
    const fallback = (courses ?? []).filter((c) => !enrolledIds.has(c.id));
    const deduped = new Map<string, Course>();

    [...(recommendedCourses ?? []), ...fallback].forEach((course) => {
      if (course?.id && !deduped.has(String(course.id))) deduped.set(String(course.id), course);
    });

    return Array.from(deduped.values())
      .filter((c) => !dismissedRecommendationIds.has(String(c.id)))
      .slice(0, 5);
  }, [courses, myCoursesData, recommendedCourses, dismissedRecommendationIds]);

  const recommendedListLoading = recommendedLoading || coursesLoading;

  // Impressions are now recorded inside CourseContext.loadRecommendedCourses
  // with score_breakdown attached, so the separate useEffect here is removed.

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
        balance={creditBalance}
        equippedTitle={equippedTitle}
        equippedFrame={equippedFrame}
        equippedBanner={equippedBanner}
        onCreditsPress={() => navigation.navigate('PointsHistory')}
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

            <View style={styles.sectionContentFrame}>
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
                  <View style={styles.emptyIconBadge}>
                    <Ionicons name="library-outline" size={48} color={Colors.textMuted ?? Colors.textSecondary} />
                  </View>
                  <Text style={styles.errorText}>You haven't enrolled in any courses yet.</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Courses')}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Browse courses</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <CourseCarousel
                  courses={getTop10Courses(myCoursesData)}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={(id) => isWishlisted?.(id) ?? false}
                />
              )}
            </View>
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

            <View style={styles.sectionContentFrame}>
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
                  <View style={styles.emptyIconBadge}>
                    <Ionicons name="heart-outline" size={48} color={Colors.textMuted ?? Colors.textSecondary} />
                  </View>
                  <Text style={styles.errorText}>You haven't added any courses into your wishlist yet.</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: Spacing.lg, paddingRight: Spacing.base }}
                >
                  {wishlist.map((course, index) => (
                    <CourseCard
                      key={String(course.id ?? `wishlist-${index}-${course.title ?? "course"}`)}
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
          </View>

          {/* Suggested Courses Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4]}>
                Recommended for You
              </Text>
            </View>

            <View style={styles.sectionContentFrame}>
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
                  {recommendedList.map((course, index) => (
                    <CourseCard
                      key={String(course.id ?? `recommended-${index}-${course.title ?? "course"}`)}
                      course={{ ...course, recommendationRank: index + 1 }}
                      variant="compact"
                      showInstructor={false}
                      showRecommendationReason={true}
                      onPress={(c) => handleRecommendationClick(c)}
                      onDismiss={handleRecommendationDismiss}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
        </View>
        <View style={{ height: 130 }} />

      {/* Bottom Navigation - Home, My Courses, Search, Settings */}
      {/* <BottomNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
      /> */}

      <InterestSelectionModal
        visible={showInterestModal}
        onConfirm={handleInterestConfirm}
        onSkip={handleInterestSkip}
      />
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
  sectionContentFrame: {
    minHeight: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    minHeight: 200,
  },
  emptyIconBadge: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.base,
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
