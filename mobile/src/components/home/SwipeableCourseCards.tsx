import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ScrollView,
  Image,
  Pressable,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Spacing, Typography, TextStyles } from "../../constants";
import { Images } from "../../assets";
import { Course } from "../../types";
import type { MainStackParamList } from "../../types/navigation";

type NavigationProp = StackNavigationProp<MainStackParamList, 'Main'>;

// Custom Image component with fallback handling
const ImageWithFallback: React.FC<{
  source: { uri: string } | any;
  fallback: any;
  style: any;
  onError?: () => void;
}> = ({ source, fallback, style, onError }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If there's no URI or an error occurred, use fallback
  if (!source?.uri || hasError) {
    return <Image source={fallback} style={style} onLoad={handleLoad} />;
  }

  return (
    <Image
      source={source}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.82;
const CARD_HEIGHT = screenHeight * 0.5;
const PREVIEW_WIDTH = screenWidth * 0.7;
const PREVIEW_SCALE = 0.88;
const SWIPE_THRESHOLD = screenWidth * 0.25;

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
  const navigation = useNavigation<NavigationProp>();

  const handleCoursePress = (courseId: string) => {
    navigation.navigate('CourseDetail', { courseId });
  };

  const handleSwipeComplete = (direction: "left" | "right") => {
    const currentCourse = courses[currentIndex];
    if (direction === "right" && onCourseLike) {
      onCourseLike(currentCourse.id);
    } else if (direction === "left" && onCourseComplete) {
      onCourseComplete(currentCourse.id);
    }
    setCurrentIndex((prev) => {
      if (direction === "right") {
        return (prev + 1) % courses.length;
      } else {
        return (prev - 1 + courses.length) % courses.length;
      }
    });
  };

  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart((_event) => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      const progress = Math.abs(event.translationX) / SWIPE_THRESHOLD;
      opacity.value = interpolate(
        progress,
        [0, 1],
        [1, 0.7],
        Extrapolate.CLAMP
      );
    })
    .onEnd((event) => {
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
      if (shouldSwipeRight || shouldSwipeLeft) {
        translateX.value = withTiming(
          shouldSwipeRight ? screenWidth : -screenWidth,
          { duration: 300 },
          () => {
            translateX.value = 0;
            opacity.value = withSpring(1);
            runOnJS(handleSwipeComplete)(shouldSwipeRight ? "right" : "left");
          }
        );
      } else {
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const leftPreviewStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [1, PREVIEW_SCALE, 0.95],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale }] };
  });

  const rightPreviewStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [0.95, PREVIEW_SCALE, 1],
      Extrapolate.CLAMP
    );
    return { transform: [{ scale }] };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-screenWidth / 2, 0, screenWidth / 2],
      [-5, 0, 5],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateX: translateX.value }, { rotate: `${rotate}deg` }],
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
  const leftIndex = (currentIndex - 1 + courses.length) % courses.length;
  const rightIndex = (currentIndex + 1) % courses.length;
  const previousCourse = courses[leftIndex];
  const nextCourse = courses[rightIndex];

  return (
    <GestureHandlerRootView>
      <View style={styles.carouselRow}>
        {/* Left preview */}
        <Animated.View
          style={[styles.previewCard, styles.leftPreview, leftPreviewStyle]}
        >
          <View style={styles.previewImageContainer}>
            <ImageWithFallback
              source={{ uri: previousCourse?.image }}
              fallback={Images.placeholder}
              style={styles.previewImage}
              
            />
          </View>
          <View style={styles.previewCardContent}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {previousCourse.title}
            </Text>
            <Text style={styles.courseDescription} numberOfLines={2}>
              {previousCourse.description}
            </Text>

            <Text style={styles.progressLabel}>
              {previousCourse.progress.completed} of{" "}
              {previousCourse.progress.total} modules completed
            </Text>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${previousCourse.progress.percentage}%` },
                ]}
              />
            </View>

            <View style={styles.instructorSection}>
              <ImageWithFallback
                source={{ uri: previousCourse?.instructor?.avatar }}
                fallback={Images.defaultAvatar}
                style={styles.instructorAvatar}
               
              />
              <View style={styles.instructorDetails}>
                <View style={styles.instructorRow}>
                  <Text style={styles.instructorName}>
                    {previousCourse.instructor.name}
                  </Text>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>
                      {previousCourse.category}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.previewCardOverlay} />
        </Animated.View>

        {/* Main course card */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.mainCard, animatedStyle]}>
            <Pressable onPress={() => handleCoursePress(currentCourse.id)} style={{ flex: 1 }}>
              {/* Hero Image Section */}
              <View style={styles.imageContainer}>
                <ImageWithFallback
                  source={{ uri: currentCourse?.image }}
                  fallback={Images.placeholder}
                  style={styles.mainImage}
                 
                />

                <View style={styles.imageOverlay} />
              </View>

              {/* Content Section */}
              <View style={styles.mainCardContent}>
              {/* Course Title */}
              <Text style={styles.courseTitle} numberOfLines={2}>
                {currentCourse.title}
              </Text>

              {/* Course Description */}
              <Text style={styles.courseDescription} numberOfLines={2}>
                {currentCourse.description}
              </Text>

              {/* Progress Section */}
              <Text style={styles.progressLabel}>
                {currentCourse.progress.completed} of{" "}
                {currentCourse.progress.total} modules completed
              </Text>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${currentCourse.progress.percentage}%` },
                  ]}
                />
              </View>

              {/* Instructor Section */}
              <View style={styles.instructorSection}>
                <ImageWithFallback
                  source={{ uri: currentCourse?.instructor?.avatar }}
                  fallback={Images.defaultAvatar}
                  style={styles.instructorAvatar}
                 
                />
                <View style={styles.instructorDetails}>
                  <View style={styles.instructorRow}>
                    <Text style={styles.instructorName}>
                      {currentCourse.instructor.name}
                    </Text>

                    {/* Category Badge */}
                    <View style={styles.catBadge}>
                      <Text style={styles.catText}>
                        {currentCourse.category}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsSection}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {currentCourse.progress.percentage}%
                  </Text>
                  <Text style={styles.statLabel}>Complete</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{currentCourse.duration}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{currentCourse.rating}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>

        {/* Right preview */}
        <Animated.View
          style={[styles.previewCard, styles.rightPreview, rightPreviewStyle]}
        >
          <View style={styles.previewImageContainer}>
            <ImageWithFallback
              source={{ uri: nextCourse?.image }}
              fallback={Images.placeholder}
              style={styles.previewImage}
             
            />
          </View>
          <View style={styles.previewCardContent}>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {nextCourse.title}
            </Text>
            <Text style={styles.courseDescription} numberOfLines={2}>
              {nextCourse.description}
            </Text>

            <Text style={styles.progressLabel}>
              {nextCourse.progress.completed} of {nextCourse.progress.total}{" "}
              modules completed
            </Text>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${nextCourse.progress.percentage}%` },
                ]}
              />
            </View>

            <View style={styles.instructorSection}>
              <ImageWithFallback
                source={{ uri: nextCourse?.instructor?.avatar }}
                fallback={Images.defaultAvatar}
                style={styles.instructorAvatar}
               
              />
              <View style={styles.instructorDetails}>
                <View style={styles.instructorRow}>
                  <Text style={styles.instructorName}>
                    {nextCourse.instructor.name}
                  </Text>
                  <View style={styles.catBadge}>
                    <Text style={styles.catText}>{nextCourse.category}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.previewCardOverlay} />
        </Animated.View>
      </View>

      {/* Indicator dots */}
      <View style={styles.indicatorContainer}>
        {courses.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 20, // Add padding for shadow space
    paddingHorizontal: 10, // Add padding for shadow space
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    height: CARD_HEIGHT * 1.15,
    borderRadius: 20,
    overflow: "hidden",
    zIndex: 0,
    marginHorizontal: -CARD_WIDTH * 0.3,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  leftPreview: {
    alignSelf: "center",
    transform: [{ scale: 0.9 }],
  },
  rightPreview: {
    alignSelf: "center",
    transform: [{ scale: 0.9 }],
  },
  previewImageContainer: {
    height: "45%",
    width: "100%",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewCardContent: {
    flex: 1,
    padding: 12,
    backgroundColor: Colors.purple850,
    justifyContent: "center",
  },
  previewCourseTitle: {
    fontSize: TextStyles.h3.fontSize,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: TextStyles.caption.fontSize,
    fontWeight: "400",
    color: Colors.textSecondary,
  },
  previewCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)", // Adjust opacity as needed
    zIndex: 2, // Ensure it is above the image but below any text/icon overlays
  },
  previewTitle: {
    fontSize: TextStyles.caption.fontSize,
    fontWeight: "600",
    color: Colors.white,
    textAlign: "center",
  },
  mainCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT * 1.15,
    borderRadius: 20,
    backgroundColor: Colors.gray600,
    // iOS Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    // Android Shadow
    elevation: 24,
    zIndex: 1,
    paddingBottom: Spacing.lg,
    // Ensure proper shadow rendering
    marginVertical: 8,
    marginHorizontal: 4,
  },
  imageContainer: {
    height: "45%",
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  mainImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  mainCardContent: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.gray600,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: TextStyles.h3.fontSize,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
    lineHeight: 24,
  },
  courseDescription: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: "400",
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  progressLabel: {
    fontSize: TextStyles.caption.fontSize,
    fontWeight: "400",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.purple400,
    borderRadius: 3,
  },
  instructorSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  instructorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  instructorDetails: {
    flex: 1,
  },
  instructorName: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  catBadge: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  catText: {
    fontSize: TextStyles.caption.fontSize,
    fontWeight: "500",
    color: Colors.white,
  },
  statsSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    justifyContent: "space-around",
    paddingBottom: Spacing.md,
  },
  statItem: {
    alignItems: "center",
    marginLeft: 16,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: "800",
    color: Colors.purple400,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: "400",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray600,
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: Colors.purple400,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completedContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  completedText: {
    fontSize: TextStyles.h3.fontSize,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  completedSubtext: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: "400",
    color: Colors.textSecondary,
    textAlign: "center",
  },
});

export default SwipeableCourseCards;
