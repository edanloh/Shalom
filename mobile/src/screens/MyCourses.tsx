import { useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMyCourses } from "../hooks";
import { useAuth } from "../contexts/AuthContext";
import { ImageWithFallback } from "../components/common";
import { Images } from "../../assets";
import {
  Colors,
  Spacing,
  TextStyles,
  BorderRadius,
  Shadows,
} from "../constants";
import type { Course } from "../types";
import { useCourses } from "../contexts/CourseContext";
import { ActionButton, Screen } from "@/components";

const ProgressBar = ({ percent }: { percent: number }) => {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.pbTrack}>
      <View style={[styles.pbFill, { width: `${p}%` }]} />
    </View>
  );
};

export default function MyCourses({ navigation }: any) {
  const { user } = useAuth();
  const { courses, loading, error, refreshing, refresh, retry } =
    useMyCourses();
  const { wishlist = [], toggleWishlist } = useCourses();

  const wishIds = useMemo(() => new Set(wishlist.map((c) => c.id)), [wishlist]);
  const isWishlisted = (c: Course) => wishIds.has(c.id);

  // useEffect(() => {
  //   console.log("MyCourses - Current user from AuthContext:", user);
  //   if (user) {
  //     console.log("MyCourses - User ID for enrollment fetch:", user.id);
  //   }
  // }, [user]);

  // Filter courses into categories
  const { continueWatching, completed, notStarted } = useMemo(() => {
    const allCourses = courses || [];

    // Continue Watching: courses with progress > 0% but < 100%
    const cw = allCourses.filter((c) => {
      const progress = c.progress?.percentage ?? 0;
      return progress > 0 && progress < 100;
    });

    // Completed: courses with 100% progress
    const comp = allCourses.filter((c) => {
      const progress = c.progress?.percentage ?? 0;
      return progress >= 100;
    });

    // Not Started: courses with 0% progress
    const ns = allCourses.filter((c) => (c.progress?.percentage ?? 0) === 0);

    console.log("MyCourses - Filtered courses:", {
      total: allCourses.length,
      continueWatching: cw.length,
      completed: comp.length,
      notStarted: ns.length,
    });

    return { continueWatching: cw, completed: comp, notStarted: ns };
  }, [courses]);

  // Combine all courses for "In Progress" section (show everything)
  const inProgress = useMemo(() => {
    return [...continueWatching, ...notStarted]; // Show both in-progress and not-started
  }, [continueWatching, notStarted]);

  const getModuleLabel = (course: Course): string => {
    const completed = course?.progress?.completed ?? 0;
    const total = course?.progress?.total ?? 1;
    const pct = course?.progress?.percentage ?? 0;

    const isDone = pct >= 100 || completed >= total;
    const index = isDone
      ? Math.max(1, Math.min(completed, total))
      : Math.max(1, Math.min(completed + 1, total));

    const raw =
      typeof course.progress?.currentModule === "string"
        ? course.progress!.currentModule!.trim()
        : "";

    if (!raw) return `Module ${index}`;
    if (/^module\s*\d+/i.test(raw)) return raw;
    return `Module ${index}: ${raw}`;
  };

  if (!user) {
    return (
      <Screen
        title="My Courses"
        navigation={navigation}
        headerLeftIcon="chevron-back"
        stickyHeader
      >
        <View style={styles.centerContainer}>
          <Text style={TextStyles.body}>
            Please log in to view your courses
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="My Courses"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      stickyHeader
    >
      <View>
        {/* Continue Watching Section - Only show if there are courses in progress */}
        {continueWatching.length > 0 && (
          <>
            <Text
              style={[
                TextStyles.h5,
                { marginVertical: Spacing.md, marginBottom: Spacing.base },
              ]}
            >
              Continue Watching
            </Text>

            <FlatList
              data={continueWatching}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={{ width: Spacing.md }} />
              )}
              extraData={wishlist}
              renderItem={({ item }) => {
                const moduleLabel = getModuleLabel(item);
                return (
                  <TouchableOpacity
                    style={styles.cwCard}
                    onPress={() =>
                      navigation.navigate("CourseDetail", { courseId: item.id })
                    }
                  >
                    <View style={styles.cwThumbWrapper}>
                      <ImageWithFallback
                        source={{ uri: item.image }}
                        fallback={Images.coursePlaceholder}
                        style={styles.cwThumb}
                      />

                      <View style={styles.progressOverlay}>
                        <Text style={styles.progressText}>
                          {Math.round(item.progress?.percentage || 0)}%
                        </Text>
                      </View>
                    </View>

                    <Text style={TextStyles.bodyMedium} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={TextStyles.caption} numberOfLines={1}>
                      {moduleLabel}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}

        {/* All My Courses Section */}
        <Text
          style={[
            TextStyles.h5,
            { marginTop: Spacing.xl, marginBottom: Spacing.base },
          ]}
        >
          My Courses
        </Text>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.purple400} />
            <Text style={styles.loadingMessage}>Loading your courses...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorMessage}>Error: {error}</Text>
            <ActionButton text="Retry" onPress={retry} />
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={TextStyles.body}>No enrolled courses</Text>
            <Text style={TextStyles.caption}>
              Enroll in a course to get started!
            </Text>
          </View>
        ) : (
          <View>
            {courses.map((item) => {
              const pct = item.progress?.percentage ?? 0;
              const moduleLabel = getModuleLabel(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("CourseDetail", { courseId: item.id })
                  }
                  style={styles.ipCard}
                >
                  <View style={styles.ipLeft}>
                    <Text style={styles.ipTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.ipMetaRow}>
                      <Ionicons name="star" size={12} color="#FACC15" />
                      <Text style={styles.ipMetaText}>
                        {(item.rating as any)?.toFixed?.(1) ?? item.rating}
                      </Text>
                      <Text style={styles.ipMetaDot}>•</Text>
                      <Text style={styles.ipMetaText}>
                        {item.modules ?? 12} modules
                      </Text>
                    </View>

                    <View style={styles.ipPercentRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                      <Text style={styles.ipMetaText}>{pct}% complete</Text>
                    </View>

                    <ProgressBar percent={pct} />
                  </View>

                  <View style={styles.ipRight}>
                    <ImageWithFallback
                      source={{ uri: item.image }}
                      fallback={Images.coursePlaceholder}
                      style={styles.ipImage}
                    />
                    <View style={styles.badgeRow}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleWishlist?.(item);
                        }}
                        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                        style={styles.heartBtn}
                        accessibilityRole="button"
                        accessibilityLabel={
                          wishIds.has(item.id)
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                      >
                        <Ionicons
                          name={
                            wishIds.has(item.id) ? "heart" : "heart-outline"
                          }
                          size={20}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const CARD_RADIUS = BorderRadius.lg;
const w = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary, // your dark background
  },

  message: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  // Continue Watching (horizontal)
  cwCard: {
    width: Math.min(w * 0.72, 300),
    gap: Spacing.sm,
  },
  cwThumbWrapper: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    backgroundColor: Colors.loadingBackdrop,
    ...Shadows.medium,
  },
  // Image fills wrapper; NO borderRadius here
  cwThumb: {
    width: "100%",
    height: 150,
    paddingBottom: Spacing.sm,
  },
  badgeRow: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  categoryBadge: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: Spacing.xs,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  heartBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },

  // In Progress (vertical cards)
  ipCard: {
    flexDirection: "row",
    backgroundColor: Colors.cardDark,
    borderRadius: CARD_RADIUS,
    marginBottom: Spacing.md,
    overflow: "hidden",
    minHeight: 100,
    maxHeight: 150,
  },
  ipLeft: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: "center",
    paddingRight: Spacing.md,
    flexShrink: 1,
  },
  ipRight: {
    width: 150,
    alignSelf: "stretch",
    backgroundColor: "#E7F0EC",
    position: "relative",
    overflow: "hidden",
  },
  ipImage: {
    flex: 1,
    width: 150,
    resizeMode: "cover",
  },
  ipTitle: {
    ...TextStyles.bodyMedium,
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 6,
  },
  ipMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
    marginBottom: 6,
  },
  ipMetaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  ipMetaDot: {
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
  ipSubtitle: {
    ...TextStyles.caption,
    marginBottom: 4,
  },
  ipPercentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },

  // progress bar
  pbTrack: {
    height: 4,
    backgroundColor: Colors.progressTrack,
    borderRadius: BorderRadius.base,
    overflow: "hidden",
  },
  pbFill: {
    height: "100%",
    backgroundColor: Colors.progressFill,
  },

  // New styles for better UX
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  loadingMessage: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.red,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  progressOverlay: {
    position: "absolute",
    bottom: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    ...TextStyles.small,
    color: Colors.white,
    fontWeight: "600",
  },
});
