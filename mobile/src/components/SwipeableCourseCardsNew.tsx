import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../constants';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.75; // Main card takes up 75% of screen
const CARD_HEIGHT = 200;
const PREVIEW_WIDTH = 50; // Width of side preview cards
const CARD_SPACING = 15;
const SWIPE_THRESHOLD = screenWidth * 0.25;

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
    category: string;
    rating: number;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
    lastAccessed: string;
  };
  duration: string;
  rating: number;
  image: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  modules: number;
}

interface SwipeableCourseCardsProps {
  courses: Course[];
  onCourseComplete?: (courseId: string) => void;
  onCourseLike?: (courseId: string) => void;
}

const SwipeableCourseCards: React.FC<SwipeableCourseCardsProps> = ({
  courses,
  onCourseComplete,
  onCourseLike,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    const currentCourse = courses[currentIndex];
    
    if (direction === 'right' && onCourseLike) {
      onCourseLike(currentCourse.id);
    } else if (direction === 'left' && onCourseComplete) {
      onCourseComplete(currentCourse.id);
    }

    // Move to next card
    if (currentIndex < courses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      translateX.value = context.startX + event.translationX;
      
      // Opacity effect
      const progress = Math.abs(event.translationX) / SWIPE_THRESHOLD;
      opacity.value = interpolate(
        progress,
        [0, 1],
        [1, 0.7],
        Extrapolate.CLAMP
      );
    },
    onEnd: (event) => {
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;

      if (shouldSwipeRight || shouldSwipeLeft) {
        // Complete the swipe animation
        translateX.value = withTiming(
          shouldSwipeRight ? screenWidth : -screenWidth,
          { duration: 300 },
          () => {
            // Reset for next card
            translateX.value = 0;
            opacity.value = withSpring(1);
            runOnJS(handleSwipeComplete)(shouldSwipeRight ? 'right' : 'left');
          }
        );
      } else {
        // Spring back to center
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screenWidth / 2, 0, screenWidth / 2],
      [-5, 0, 5],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
      opacity: opacity.value,
    };
  });

  if (currentIndex >= courses.length) {
    return (
      <View style={styles.completedContainer}>
        <Text style={styles.completedText}>🎉 All courses reviewed!</Text>
        <Text style={styles.completedSubtext}>
          Great job keeping up with your learning goals!
        </Text>
      </View>
    );
  }

  const currentCourse = courses[currentIndex];
  const previousCourse = courses[currentIndex - 1];
  const nextCourse = courses[currentIndex + 1];

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.carouselContainer}
      >
        {/* Previous course preview (left) */}
        {previousCourse && (
          <View style={[styles.previewCard, styles.leftPreview]}>
            <Image source={{ uri: previousCourse.image }} style={styles.previewImage} />
            <View style={styles.previewOverlay}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {previousCourse.title}
              </Text>
            </View>
          </View>
        )}

        {/* Main course card */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.mainCard, animatedStyle]}>
            <Image source={{ uri: currentCourse.image }} style={styles.mainImage} />
            <View style={styles.cardContent}>
              {/* Course category badge */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{currentCourse.instructor.category}</Text>
              </View>
              
              {/* Course title and description */}
              <Text style={styles.courseTitle} numberOfLines={2}>
                {currentCourse.title}
              </Text>
              <Text style={styles.courseSubtitle} numberOfLines={1}>
                {currentCourse.description}
              </Text>
              
              {/* Progress section */}
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View 
                    style={[styles.progressFill, { width: `${currentCourse.progress.percentage}%` }]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentCourse.progress.completed}/{currentCourse.progress.total} modules • {currentCourse.progress.percentage}% complete
                </Text>
              </View>
              
              {/* Instructor info */}
              <View style={styles.instructorRow}>
                <Image 
                  source={{ uri: currentCourse.instructor.avatar }} 
                  style={styles.instructorAvatar} 
                />
                <View style={styles.instructorInfo}>
                  <Text style={styles.instructorName}>{currentCourse.instructor.name}</Text>
                  <Text style={styles.instructorCategory}>{currentCourse.instructor.category}</Text>
                </View>
                
                {/* Course stats */}
                <View style={styles.statsContainer}>
                  <Text style={styles.duration}>{currentCourse.duration}</Text>
                  <Text style={styles.rating}>⭐ {currentCourse.rating}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </PanGestureHandler>

        {/* Next course preview (right) */}
        {nextCourse && (
          <View style={[styles.previewCard, styles.rightPreview]}>
            <Image source={{ uri: nextCourse.image }} style={styles.previewImage} />
            <View style={styles.previewOverlay}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {nextCourse.title}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Course indicator dots */}
      <View style={styles.indicatorContainer}>
        {courses.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator
            ]}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 280,
    marginVertical: Spacing.base,
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    height: CARD_HEIGHT * 0.8,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: CARD_SPACING / 2,
    opacity: 0.6,
    position: 'relative',
  },
  leftPreview: {
    transform: [{ scale: 0.9 }],
  },
  rightPreview: {
    transform: [{ scale: 0.9 }],
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
  },
  previewTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 8,
    color: Colors.white,
    textAlign: 'center',
  },
  mainCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mainImage: {
    width: '100%',
    height: '50%',
    resizeMode: 'cover',
  },
  cardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  categoryText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 10,
    color: Colors.white,
  },
  courseTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  courseSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  progressSection: {
    marginBottom: Spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.gray600,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: Colors.textSecondary,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instructorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  instructorInfo: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  instructorName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: Colors.textPrimary,
  },
  instructorCategory: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 9,
    color: Colors.textSecondary,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  duration: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: Colors.textPrimary,
  },
  rating: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: Colors.textSecondary,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray600,
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: Colors.secondary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completedContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  completedText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  completedSubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default SwipeableCourseCards;
