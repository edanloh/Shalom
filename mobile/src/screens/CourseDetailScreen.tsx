import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, TextStyles } from '../constants';
import { Images } from '../../assets';
import { courseDetailService, ProcessedCourseDetail, CourseModule } from '../services/courseDetailService';
import type { MainStackParamList } from '../types/navigation';
import { ImageWithFallback } from '../components/common';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import { moduleService, ModuleDetailResponse, UserProgress, CourseSection } from '../services/moduleService';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/common/Screen';
import ActionButton from '@/components/ActionButton';

const { width: screenWidth } = Dimensions.get('window');

type Props = StackScreenProps<MainStackParamList, 'CourseDetail'>;
type CourseContent = ModuleDetailResponse['data'];

export default function CourseDetailScreen({
  navigation,
  route,
}: StackScreenProps<MainStackParamList, "CourseDetail">) {
  
  const { courseId } = route.params;
  const [courseDetail, setCourseDetail] = useState<ProcessedCourseDetail | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const userId = user?.id;

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadCourseDetail();
    }, [courseId])
  );

  useEffect(() => {
    (async () => {
      if (!userId) return;          // user must be logged in
      try {
        const enrolled = await courseService.isUserEnrolledInCourse(userId, courseId);
        setIsEnrolled(enrolled);
      } catch (e) {
        console.log('Enroll status check failed:', e);
      }
    })();
  }, [courseId, userId]);
  const calculateCourseProgress = (): number => {
    if (!courseContent || !courseContent.userProgress) return 0;
    
    const totalItems = courseContent.sections.reduce((sum, section) => sum + section.items.length, 0);
    if (totalItems === 0) return 0;
    
    const completedItems = courseContent.sections.reduce((sum, section) => {
      return sum + section.items.filter(item => 
        moduleService.isItemCompleted(item, courseContent.userProgress)
      ).length;
    }, 0);
    
    return Math.round((completedItems / totalItems) * 100);
  };

  const getCompletedModulesCount = (): number => {
    if (!courseContent) return 0;
    return courseContent.sections.filter(section => section.module_is_completed).length;
  };

  const loadCourseDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both course detail and module detail with user progress
      const [detail, moduleData] = await Promise.all([
        courseDetailService.getCourseDetail(courseId),
        moduleService.getModuleDetail(courseId, '550e8400-e29b-41d4-a716-446655440101') // TODO: Replace with actual user ID from auth context
      ]);
      
      setCourseDetail(detail);
      setCourseContent(moduleData);
    } catch (err) {
      console.error('Failed to load course detail:', err);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFD700" />);
      }
    }
    return stars;
  };

  const renderRatingBreakdown = (breakdown: Record<number, number>) => {
    return (
      <View style={styles.ratingBreakdown}>
        {[5, 4, 3, 2, 1].map((star) => (
          <View key={star} style={styles.ratingRow}>
            <Text style={styles.starNumber}>{star}</Text>
            <View style={styles.ratingBar}>
              <View 
                style={[
                  styles.ratingBarFill, 
                  { width: `${breakdown[star] || 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.ratingPercentage}>{breakdown[star] || 0}%</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderModule = (module: CourseModule, index: number) => {
    const section = courseContent?.sections.find(s => s.id === module.id);
    const isCompleted = section?.module_is_completed || false;
    const completedAt = section?.module_completed_at;

    const onOpen = () => {
      if (!isEnrolled) {
        Alert.alert(
          'Enrollment required',
          'Please enroll to access lessons and quizzes.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enroll now', onPress: handleEnroll },
          ],
        );
        return;
      }
      navigation.navigate('ModuleDetail', {
        courseId: route.params.courseId,
        sectionId: module.id,
        userId: userId ?? '',
      });
    };

    return (
      <Pressable key={module.id} style={styles.moduleItem} onPress={onOpen}>
        <View style={styles.moduleIcon}>
          <Ionicons name="book-outline" size={20} color={Colors.purple400} />
        </View>
        <View style={styles.moduleContent}>
          <View style={styles.moduleTitleRow}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            )}
          </View>
          {!!module.description && (
            <Text style={styles.moduleDescription}>{module.description}</Text>
          )}
          {isCompleted && completedAt && (
            <Text style={styles.completedDate}>
              Completed on {new Date(completedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
        <View style={styles.moduleRightSection}>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </View>
      </Pressable>
    );
  };

  const renderReview = (review: ProcessedCourseDetail['reviews'][0]) => (
    <View key={`${review.reviewerName}-${review.createdAt}`} style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <ImageWithFallback
          source={{ uri: review.reviewerAvatar }}
          fallback={Images.defaultAvatar}
          style={styles.reviewerAvatar}
        />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewerName}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.reviewRating}>
        {renderStarRating(review.rating)}
      </View>
      <Text style={styles.reviewText}>{review.review}</Text>
    </View>
  );

  const handleLeaveReview = () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to leave a review.');
      return;
    }
    navigation.navigate('LeaveReview', { courseId });
  };

  const handleEnroll = async () => {
    if (isEnrolling) return;
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to enroll.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsEnrolling(true);
      const { firstModuleId } = await courseService.enrollInCourse(userId, courseId);

      // If you want to immediately take them somewhere after enroll, keep this:
      // navigation.replace(
      //   'CourseOutline',
      //   firstModuleId ? { courseId, startAt: firstModuleId } : { courseId }
      // );
      // Otherwise, do nothing and let the screen re-render as enrolled.
    } catch (e: any) {
      const status = e?.statusCode ?? e?.response?.status;
      console.log('[Enroll] error', { status, code: e?.code, msg: e?.message, details: e?.details });
      Alert.alert(`Enrollment failed ${status ? `(${status})` : ''}`, e?.details?.message || e?.message || 'Try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.purple400} />
        <Text style={styles.loadingText}>Loading course details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !courseDetail) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Course not found'}</Text>
        <Pressable style={styles.retryButton} onPress={loadCourseDetail}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <Screen
      title=""
      noHeader
      widescreen
      customEdges={["bottom"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <ImageWithFallback
          source={{ uri: courseDetail.image }}
          fallback={Images.placeholder}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Course Info */}
        <Text style={styles.courseTitle}>{courseDetail.title}</Text>
        
        <Text style={styles.courseOverview}>Overview</Text>
        <Text style={styles.courseDescription}>{courseDetail.description}</Text>

        {/* Course Progress Section */}
        {courseContent && courseContent.userProgress && (
          <>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Course Progress</Text>
                <Text style={styles.progressPercentage}>{calculateCourseProgress()}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${calculateCourseProgress()}%` }
                    ]} 
                  />
                </View>
              </View>
              <View style={styles.progressStats}>
                <Text style={styles.progressStatsText}>
                  {getCompletedModulesCount()} of {courseDetail.modules.length} modules completed
                </Text>
                {/* {calculateCourseProgress() === 100 && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                    <Text style={styles.completedBadgeText}>Course Completed!</Text>
                  </View>
                )} */}
              </View>
            </View>
          </>
        )}

        {/* Modules Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modules</Text>
          {courseContent && getCompletedModulesCount() === courseDetail.modules.length && courseDetail.modules.length > 0 && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
              <Text style={styles.completedBadgeText}>All Completed</Text>
            </View>
          )}
        </View>
        <View style={styles.modulesList}>
          {courseDetail.modules.length > 0 ? (
            courseDetail.modules.map(renderModule)
          ) : (
            <View style={styles.noModulesContainer}>
              <Text style={styles.noModulesText}>No modules available</Text>
            </View>
          )}
        </View>

        {/* Instructor Section */}
        <Text style={styles.sectionTitle}>Instructor</Text>
        <View style={styles.instructorSection}>
          <ImageWithFallback
            source={{ uri: courseDetail.instructor.avatar }}
            fallback={Images.defaultAvatar}
            style={styles.instructorAvatar}
          />
          <View style={styles.instructorInfo}>
            <Text style={styles.instructorName}>{courseDetail.instructor.name}</Text>
            <Text style={styles.instructorRole}>Data Science Expert</Text>
          </View>
        </View>

        {/* Course Reviews */}
        <Text style={styles.sectionTitle}>Course Reviews</Text>
        
        {/* Rating Summary */}
        <View style={styles.reviewsSectionCard}>
          {/* Top row: Left summary (with button) + Right breakdown */}
          <View style={styles.reviewsTopRow}>
            {/* Left: summary + button */}
            <View style={styles.reviewsSummaryCol}>
              <Text style={styles.ratingNumber}>{courseDetail.rating.toFixed(1)}</Text>
              <View style={styles.starsContainer}>
                {renderStarRating(courseDetail.rating)}
              </View>
              <Text style={styles.reviewCount}>
                {courseDetail.totalRatings} ratings · {courseDetail.reviews.length} reviews
              </Text>

              <ActionButton
                onPress={handleLeaveReview}
                text={'Leave a Review'}
                style={{height: 42, padding: 12, paddingTop: 9, marginTop: Spacing.md, marginBottom: Spacing.xs}}
              />
            </View>

            {/* Right: rating breakdown (kept as-is) */}
            {renderRatingBreakdown(courseDetail.ratingBreakdown)}
          </View>

          {/* Divider */}
          <View style={styles.reviewsDivider} />

          {/* Reviews list (rows feel part of same section) */}
          <View style={styles.reviewsListTight}>
            {courseDetail.reviews.map(renderReview)}
          </View>
        </View>

        {/* Enroll Button */}
        {!isEnrolled && (
          <ActionButton
            onPress={handleEnroll}
            text={'Enroll Now'}
            disabled={isEnrolling}
            loading={isEnrolling}
          />
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: Colors.red,
    fontSize: TextStyles.body.fontSize,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: Spacing.lg*2,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    position: 'relative',
    height: 250,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  courseOverview: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  courseDescription: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modulesList: {
    marginBottom: Spacing.xl,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.purple400 + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moduleRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleTitle: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  moduleDescription: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  completedDate: {
    fontSize: 11,
    color: Colors.green,
    marginTop: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.green + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.green,
    marginLeft: 4,
  },
  progressCard: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressLabel: {
    fontSize: TextStyles.h4.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.purple400,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.gray500,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.purple400,
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatsText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
  },
  instructorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textInputBg,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  instructorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: TextStyles.h4.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  instructorRole: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  reviewsSectionCard: {
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  reviewsTopRow: {
    flexDirection: 'row',
  },
  reviewsSummaryCol: {
    width: screenWidth * 0.48,  // left column like the screenshot
    maxWidth: 340,
    paddingRight: Spacing.lg,
    alignItems: 'flex-start',
  },
  reviewsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray500,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reviewsListTight: {
    // keep empty — makes the list feel part of the same section
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: Spacing.xs,
  },
  reviewCount: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
  },
  ratingBreakdown: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starNumber: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textPrimary,
    width: 10,
    marginRight: Spacing.sm,
  },
  ratingBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray500,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.yellow,
    borderRadius: 3,
  },
  ratingPercentage: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    minWidth: 28,
    textAlign: 'right',
  },
  reviewItem: {
    backgroundColor: 'transparent',       // was Colors.textInputBg
    paddingVertical: Spacing.md,          // a bit tighter
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray500,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,             // was Spacing.sm
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  reviewText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noModulesContainer: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  noModulesText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});