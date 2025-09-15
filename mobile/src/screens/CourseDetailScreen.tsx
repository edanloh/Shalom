import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
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
import { Images } from '../assets';
import { courseDetailService, ProcessedCourseDetail, CourseModule } from '../services/courseDetailService';
import type { MainStackParamList } from '../types/navigation';
import { ImageWithFallback } from '../components/common';

const { width: screenWidth } = Dimensions.get('window');

type Props = StackScreenProps<MainStackParamList, 'CourseDetail'>;

const CourseDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { courseId } = route.params;
  const [courseDetail, setCourseDetail] = useState<ProcessedCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourseDetail();
  }, [courseId]);

  const loadCourseDetail = async () => {
    console.log('[CourseDetailScreen] Loading course detail for ID:', courseId);
    try {
      setLoading(true);
      setError(null);
      const detail = await courseDetailService.getCourseDetail(courseId);
      setCourseDetail(detail);
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

  const renderModule = (module: CourseModule, index: number) => (
    <View key={module.id} style={styles.moduleItem}>
      <View style={styles.moduleIcon}>
        <Ionicons name="book-outline" size={20} color={Colors.purple400} />
      </View>
      <View style={styles.moduleContent}>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        {module.description && (
          <Text style={styles.moduleDescription}>{module.description}</Text>
        )}
      </View>
      {module.isCompleted && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
      )}
    </View>
  );

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

          {/* Modules Section */}
          <Text style={styles.sectionTitle}>Modules</Text>
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
          <View style={styles.ratingSummary}>
            <View style={styles.ratingOverview}>
              <Text style={styles.ratingNumber}>{courseDetail.rating.toFixed(1)}</Text>
              <View style={styles.starsContainer}>
                {renderStarRating(courseDetail.rating)}
              </View>
              <Text style={styles.reviewCount}>{courseDetail.totalRatings} reviews</Text>
            </View>
            
            {renderRatingBreakdown(courseDetail.ratingBreakdown)}
          </View>

          {/* Individual Reviews */}
          <View style={styles.reviewsList}>
            {courseDetail.reviews.map(renderReview)}
          </View>

          {/* Enroll Button */}
          <View style={styles.enrollSection}>
            <Pressable style={styles.enrollButton}>
              <Text style={styles.enrollButtonText}>Enroll Now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
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
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
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
    paddingHorizontal: Spacing.lg,
    minHeight: '100%',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  modulesList: {
    marginBottom: Spacing.xl,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.gray600,
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
  moduleTitle: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  moduleDescription: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  instructorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray600,
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
    fontSize: TextStyles.h3.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  instructorRole: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratingSummary: {
    flexDirection: 'row',
    backgroundColor: Colors.gray600,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  ratingOverview: {
    alignItems: 'center',
    marginRight: Spacing.xl,
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
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.purple400,
    borderRadius: 3,
  },
  ratingPercentage: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  reviewsList: {
    marginBottom: Spacing.xl,
  },
  reviewItem: {
    backgroundColor: Colors.gray600,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
    backgroundColor: Colors.gray600,
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
  enrollSection: {
    paddingVertical: Spacing.xl,
    paddingBottom: 40,
  },
  enrollButton: {
    backgroundColor: Colors.purple400,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  enrollButtonText: {
    fontSize: TextStyles.h3.fontSize,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default CourseDetailScreen;