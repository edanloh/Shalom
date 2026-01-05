import React, { useRef } from "react";
import { View, StyleSheet, Dimensions, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  SharedValue,
  Extrapolation,
} from "react-native-reanimated";
import { Spacing, Colors, Typography, TextStyles } from "../../constants";
import { Course } from "../../types";
import type { MainStackParamList } from "../../types/navigation";
import { ImageWithFallback } from "../common";
import { Images } from "../../../assets";
import { Ionicons } from "@expo/vector-icons";
import { useCourses } from "../../contexts/CourseContext";

type NavigationProp = StackNavigationProp<MainStackParamList, "MainTabs">;

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_HEIGHT = screenHeight * 0.6;
const CARD_WIDTH = screenWidth * 0.7;

interface CourseCarouselProps {
  courses: Course[];
  onCourseComplete?: (courseId: string) => void;
  onCourseLike?: (courseId: string) => void;
  onToggleWishlist?: (course: Course) => void;
  isWishlisted?: (courseId: string) => boolean;
}

export default function CourseCarousel({
  courses,
  onCourseComplete,
  onCourseLike,
  onToggleWishlist,
  isWishlisted,
}: CourseCarouselProps) {
  const navigation = useNavigation<NavigationProp>();
  const scrollX = useSharedValue(0);
  const { wishlist = [], toggleWishlist } = useCourses();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + Spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {courses.map((course, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + Spacing.md),
            index * (CARD_WIDTH + Spacing.md),
            (index + 1) * (CARD_WIDTH + Spacing.md),
          ];

          return (
            <CourseCardItem
              key={course.id}
              course={course}
              index={index}
              scrollX={scrollX}
              inputRange={inputRange}
              onPress={() =>
                navigation.navigate("CourseDetail", { courseId: course.id })
              }
              onToggleWishlist={onToggleWishlist}
              isWishlisted={isWishlisted}
            />
          );
        })}
      </Animated.ScrollView>

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {courses.length <= 10 ? (
          courses.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              scrollX={scrollX}
              coursesLength={courses.length}
            />
          ))
        ) : (
          <LimitedPaginationDots
            scrollX={scrollX}
            totalCourses={courses.length}
          />
        )}
      </View>
    </View>
  );
}

interface CourseCardItemProps {
  course: Course;
  index: number;
  scrollX: SharedValue<number>;
  inputRange: number[];
  onPress: () => void;
  onToggleWishlist?: (course: Course) => void;
  isWishlisted?: (courseId: string) => boolean;
}

function CourseCardItem({
  course,
  index,
  scrollX,
  inputRange,
  onPress,
  onToggleWishlist,
  isWishlisted,
}: CourseCardItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.92, 1.05, 0.92],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const wishlisted = isWishlisted?.(course.id) ?? false;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable onPress={onPress} style={{flex: 1}}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <ImageWithFallback
            source={{ uri: course?.image }}
            fallback={Images.placeholder}
            style={styles.mainImage}
          />

          {/* Category Badge - Top Left */}
          <View style={styles.catBadge}>
            <Text style={TextStyles.bodySmall}>
              {course.category || course.level}
            </Text>
          </View>

          <View style={styles.imageOverlay} />
        </View>

        {/* Content Section */}
        <View style={styles.mainCardContent}>
          {/* Course Title */}
          <Text style={TextStyles.h5} numberOfLines={2}>
            {course.title}
          </Text>

          {/* Course Description */}
          <Text style={TextStyles.caption} numberOfLines={2}>
            {course.description}
          </Text>

          {/* Progress Section */}
          <Text style={[TextStyles.bodySmall, {marginVertical: Spacing.sm}]}>
            {course.progress?.completed || 0} of{" "}
            {course.progress?.total || course.modules || 0} modules completed
          </Text>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${course.progress?.percentage || 0}%` },
              ]}
            />
          </View>

          {/* Instructor Section */}
          <View style={styles.instructorSection}>
            <ImageWithFallback
              source={{ uri: course?.instructor?.avatar }}
              fallback={Images.defaultAvatar}
              style={styles.instructorAvatar}
            />
            <View>
              <Text style={TextStyles.body}>
                {course.instructor?.name || "Instructor"}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {course.progress?.percentage || 0}%
              </Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{course.duration || "14h"}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{course.rating || "4.5"}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Wishlist Heart - Positioned outside parent Pressable */}
      <Pressable
        onPress={() => onToggleWishlist?.(course)}
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        style={styles.heartBtn}
        accessibilityRole="button"
        accessibilityLabel={
          wishlisted ? "Remove from wishlist" : "Add to wishlist"
        }
      >
        <Ionicons
          name={wishlisted ? "heart" : "heart-outline"}
          size={20}
          color="#fff"
        />
      </Pressable>
    </Animated.View>
  );
}

interface PaginationDotProps {
  index: number;
  scrollX: SharedValue<number>;
  coursesLength: number;
}

function PaginationDot({ index, scrollX, coursesLength }: PaginationDotProps) {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + Spacing.md),
      index * (CARD_WIDTH + Spacing.md),
      (index + 1) * (CARD_WIDTH + Spacing.md),
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return <Animated.View style={[styles.paginationDot, animatedDotStyle]} />;
}

interface LimitedPaginationDotsProps {
  scrollX: SharedValue<number>;
  totalCourses: number;
}

function LimitedPaginationDots({
  scrollX,
  totalCourses,
}: LimitedPaginationDotsProps) {
  const MAX_DOTS = 10;

  return (
    <>
      {Array.from({ length: MAX_DOTS }).map((_, i) => {
        const animatedDotStyle = useAnimatedStyle(() => {
          const currentIndex = Math.round(
            scrollX.value / (CARD_WIDTH + Spacing.md)
          );

          // Calculate which dots to show based on current position
          let startIndex = Math.max(0, currentIndex - Math.floor(MAX_DOTS / 2));
          const endIndex = Math.min(
            totalCourses - 1,
            startIndex + MAX_DOTS - 1
          );

          // Adjust start if we're near the end
          if (endIndex - startIndex < MAX_DOTS - 1) {
            startIndex = Math.max(0, endIndex - MAX_DOTS + 1);
          }

          const actualIndex = startIndex + i;

          // Hide dots that are beyond the total courses
          if (actualIndex >= totalCourses) {
            return { opacity: 0, width: 0 };
          }

          const inputRange = [
            (actualIndex - 1) * (CARD_WIDTH + Spacing.md),
            actualIndex * (CARD_WIDTH + Spacing.md),
            (actualIndex + 1) * (CARD_WIDTH + Spacing.md),
          ];

          const dotWidth = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
          );

          const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolation.CLAMP
          );

          return {
            width: dotWidth,
            opacity,
          };
        });

        return (
          <Animated.View
            key={i}
            style={[styles.paginationDot, animatedDotStyle]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: CARD_HEIGHT*1.12,
  },
  scrollContent: {
    paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
    paddingVertical: Spacing.base,
    alignContent: "center",
    gap: Spacing.md,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.purple400,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: Colors.gray600,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
    alignSelf: "center",
    marginVertical: 20,
  },
  imageContainer: {
    height: "35%",
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
  catBadge: {
    position: "absolute",
    top: 12,
    left: 14,
    zIndex: 10,
    backgroundColor: Colors.purple400,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    padding: 6,
  },
  mainCardContent: {
    flex: 1,
    padding: Spacing.base,
    backgroundColor: Colors.gray600,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  courseTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: TextStyles.h3.fontSize,
    color: Colors.textPrimary,
    marginBottom: 6,
    lineHeight: 24,
  },
  courseDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  progressLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  instructorAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 12,
  },
  instructorName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textPrimary,
  },
  statsSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: Typography.fontFamily.extraBold,
    fontSize: Typography.fontSize.lg,
    color: Colors.purple400,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
