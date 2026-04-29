import React, { useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  SharedValue,
  Extrapolation,
} from "react-native-reanimated";
import { Spacing, Colors, Typography, TextStyles } from "../../constants";
import { Course } from "../../types";
import type { MainStackParamList } from "../../types/navigation";
import { ImageWithFallback } from "../common";
import AnimatedHeartButton from "../common/AnimatedHeartButton";
import { Images } from "../../../assets";
import { Ionicons } from "@expo/vector-icons";
import { useCourses } from "../../contexts/CourseContext";

type NavigationProp = StackNavigationProp<MainStackParamList, "MainTabs">;

interface CourseCarouselProps {
  courses: Course[];
  onCourseComplete?: (courseId: string) => void;
  onToggleWishlist?: (course: Course) => void;
  isWishlisted?: (courseId: string) => boolean;
}

export default function CourseCarousel({
  courses,
  onCourseComplete,
  onToggleWishlist,
  isWishlisted,
}: CourseCarouselProps) {
  const navigation = useNavigation<NavigationProp>();
  const scrollX = useSharedValue(0);
  const { wishlist = [], toggleWishlist } = useCourses();
  const { width: screenWidth } = useWindowDimensions();

  const CARD_WIDTH = useMemo(
    () => Math.min(screenWidth * 0.7, 400),
    [screenWidth],
  );

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
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingRight: (screenWidth - CARD_WIDTH) / 2,
            paddingLeft: Spacing.lg,
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.lg,
          },
        ]}
      >
        {courses.map((course, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + Spacing.md),
            index * (CARD_WIDTH + Spacing.md),
            (index + 1) * (CARD_WIDTH + Spacing.md),
          ];

          return (
            <CourseCardItem
              key={String(course.id ?? `carousel-${index}-${course.title ?? "course"}`)}
              course={course}
              index={index}
              scrollX={scrollX}
              inputRange={inputRange}
              cardWidth={CARD_WIDTH}
              onPress={() =>
                navigation.navigate("CourseDetail", { courseId: course.id, sourceScreen: "Home" })
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
              cardWidth={CARD_WIDTH}
            />
          ))
        ) : (
          <LimitedPaginationDots
            scrollX={scrollX}
            totalCourses={courses.length}
            cardWidth={CARD_WIDTH}
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
  cardWidth: number;
  onPress: () => void;
  onToggleWishlist?: (course: Course) => void;
  isWishlisted?: (courseId: string) => boolean;
}

const getCourseProgressPercent = (course: Course): number => {
  const candidates = [
    (course as any)?.progress_percentage,
    (course as any)?.progress?.percentage,
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.min(100, Math.round(numeric)));
    }
  }
  return 0;
};

function CourseCardItem({
  course,
  index,
  scrollX,
  inputRange,
  cardWidth,
  onPress,
  onToggleWishlist,
  isWishlisted,
}: CourseCardItemProps) {
  const progressPercent = getCourseProgressPercent(course);
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const scrollScale = interpolate(
      scrollX.value,
      inputRange,
      [0.92, 1.05, 0.92],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale: scrollScale * pressScale.value }],
      opacity,
    };
  });

  const wishlisted = isWishlisted?.(course.id) ?? false;

  return (
    <Animated.View style={[styles.card, animatedStyle, { width: cardWidth }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { pressScale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { pressScale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
        style={{ flex: 1 }}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <ImageWithFallback
            source={{ uri: course?.image }}
            fallback={Images.placeholder}
            style={styles.mainImage}
          />

          {/* Category Badge - Top Left */}
          <View
            style={[styles.catBadge, { backgroundColor: course.categoryColor }]}
          >
            <Text style={TextStyles.bodySmall}>{course.category}</Text>
          </View>

          <View style={styles.imageOverlay} />
        </View>

        {/* Content Section */}
        <View style={styles.mainCardContent}>
          {/* Course Title */}
          <View style={styles.titleWrap}>
            <Text style={TextStyles.h5} numberOfLines={2}>
              {course.title}
            </Text>
          </View>

          {/* Course Description */}
          <View style={styles.descWrap}>
            <Text style={TextStyles.caption} numberOfLines={2}>
              {course.description}
            </Text>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercent}% Complete</Text>
          </View>

          {/* Instructor Section */}
          <View style={styles.instructorSection}>
            <ImageWithFallback
              source={{ uri: course?.instructor?.avatar }}
              fallback={Images.defaultAvatar}
              style={styles.instructorAvatar}
            />
            <Text style={TextStyles.body} numberOfLines={1}>
              {course.instructor?.name || "Instructor"}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{course.duration || "—"}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Number.isFinite(Number(course.rating)) && Number(course.rating) > 0
                  ? Number(course.rating).toFixed(1)
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Wishlist Heart - Positioned outside parent Pressable */}
      <AnimatedHeartButton
        onPress={() => onToggleWishlist?.(course)}
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        style={styles.heartBtn}
        accessibilityLabel={
          wishlisted ? "Remove from wishlist" : "Add to wishlist"
        }
        filled={wishlisted}
      />
    </Animated.View>
  );
}

interface PaginationDotProps {
  index: number;
  scrollX: SharedValue<number>;
  coursesLength: number;
  cardWidth: number;
}

function PaginationDot({
  index,
  scrollX,
  coursesLength,
  cardWidth,
}: PaginationDotProps) {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (cardWidth + Spacing.md),
      index * (cardWidth + Spacing.md),
      (index + 1) * (cardWidth + Spacing.md),
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );

    return {
      width: dotWidth,
      opacity,
    };
  });

  return <Animated.View style={[styles.paginationDot, animatedDotStyle]} />;
}

const MAX_DOTS = 10;

interface LimitedPaginationDotProps {
  dotIndex: number;
  scrollX: SharedValue<number>;
  totalCourses: number;
  cardWidth: number;
}

function LimitedPaginationDot({
  dotIndex,
  scrollX,
  totalCourses,
  cardWidth,
}: LimitedPaginationDotProps) {
  const animatedDotStyle = useAnimatedStyle(() => {
    const currentIndex = Math.round(scrollX.value / (cardWidth + Spacing.md));

    let startIndex = Math.max(0, currentIndex - Math.floor(MAX_DOTS / 2));
    const endIndex = Math.min(totalCourses - 1, startIndex + MAX_DOTS - 1);

    if (endIndex - startIndex < MAX_DOTS - 1) {
      startIndex = Math.max(0, endIndex - MAX_DOTS + 1);
    }

    const actualIndex = startIndex + dotIndex;

    if (actualIndex >= totalCourses) {
      return { opacity: 0, width: 0 };
    }

    const inputRange = [
      (actualIndex - 1) * (cardWidth + Spacing.md),
      actualIndex * (cardWidth + Spacing.md),
      (actualIndex + 1) * (cardWidth + Spacing.md),
    ];

    return {
      width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.paginationDot, animatedDotStyle]} />;
}

interface LimitedPaginationDotsProps {
  scrollX: SharedValue<number>;
  totalCourses: number;
  cardWidth: number;
}

function LimitedPaginationDots({
  scrollX,
  totalCourses,
  cardWidth,
}: LimitedPaginationDotsProps) {
  return (
    <>
      {Array.from({ length: MAX_DOTS }).map((_, i) => (
        <LimitedPaginationDot
          key={i}
          dotIndex={i}
          scrollX={scrollX}
          totalCourses={totalCourses}
          cardWidth={cardWidth}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  scrollContent: {
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
    borderRadius: 20,
    backgroundColor: Colors.gray600,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
    alignSelf: "center",
    marginVertical: Spacing.sm,
  },
  imageContainer: {
    height: 200,
    minHeight: 150,
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
    gap: Spacing.xs,
  },
  courseTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: TextStyles.h3.fontSize,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  courseDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  titleWrap: {
    height: 54,
    justifyContent: "flex-start",
  },
  descWrap: {
    height: 42,
    justifyContent: "flex-start",
  },
  progressSection: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  progressText: {
    marginTop: 4,
    fontFamily: Typography.fontFamily.medium,
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    flex: 1, // take remaining horizontal space
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
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
    justifyContent: "center",
    marginVertical: Spacing.sm,
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.gray200,
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
