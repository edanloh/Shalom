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
import AnimatedHeartButton from "../components/common/AnimatedHeartButton";
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

  // Filter courses into categories
  const { continueWatching, completed, notStarted } = useMemo(() => {
    const allCourses = courses || [];

    // Continue Watching: courses with progress > 0% but < 100%
    const cw = allCourses.filter((c) => {
      const progress = c.progress_percentage ?? 0;
      return progress > 0 && progress < 100;
    });

    // Completed: courses with 100% progress
    const comp = allCourses.filter((c) => {
      const progress = c.progress_percentage ?? 0;
      return progress >= 100;
    });

    // Not Started: courses with 0% progress
    const ns = allCourses.filter((c) => (c.progress_percentage ?? 0) === 0);

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
    const modules = course.modules ?? 0;
    return `Module ${modules > 0 ? 1 : 0}`;
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
              keyExtractor={(item, index) =>
                String(item.id ?? `continue-${index}-${item.title ?? "course"}`)
              }
              horizontal
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={{ width: Spacing.md }} />
              )}
              extraData={wishlist}
              renderItem={({ item }) => {
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
                    </View>
                    <View style={{ paddingHorizontal: Spacing.md, gap: 4 }}>
                      <Text style={TextStyles.bodyMedium} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[TextStyles.caption, { fontWeight: "600" }]} numberOfLines={1}>
                        {item.modules ?? 0} modules
                      </Text>
                    </View>
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
            {courses.map((item, index) => {
              const pct = Math.round(item.progress_percentage ?? 0);
              return (
                <TouchableOpacity
                  key={String(item.id ?? `my-course-${index}-${item.title ?? "course"}`)}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("CourseDetail", { courseId: item.id })
                  }
                  style={styles.ipCard}
                >
                  <View style={styles.ipLeft}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor:
                            item.categoryColor || Colors.purple400,
                        },
                        styles.categoryBadgeTop,
                      ]}
                    >
                      <Text style={styles.categoryText} numberOfLines={1}>
                        {item.category}
                      </Text>
                    </View>

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
                        {item.modules ?? 0} modules
                      </Text>
                    </View>

                    <View style={styles.ipPercentRow}>
                      <Text style={styles.ipPercentText}>{pct}% complete</Text>
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
                      <AnimatedHeartButton
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleWishlist?.(item);
                        }}
                        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                        style={styles.heartBtn}
                        accessibilityLabel={
                          wishIds.has(item.id)
                            ? "Remove from wishlist"
                            : "Add to wishlist"
                        }
                        filled={wishIds.has(item.id)}
                      />
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
    height: "100%",
    gap: Spacing.sm,
    backgroundColor: Colors.gray600 ,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    paddingBottom: Spacing.sm,
    ...Shadows.medium,
  },
  cwThumbWrapper: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    ...Shadows.medium,
  },
  // Image fills wrapper; NO borderRadius here
  cwThumb: {
    width: "100%",
    height: 150,
    paddingBottom: Spacing.xs,
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
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1,
    maxWidth: "72%",
  },
  categoryBadgeTop: {
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  heartBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },

  // In Progress (vertical cards)
  ipCard: {
    flexDirection: "row",
    backgroundColor: Colors.gray600,
    borderRadius: CARD_RADIUS,
    marginBottom: Spacing.md,
    overflow: "hidden",
    minHeight: 110,
    maxHeight: 160,
    ...Shadows.medium,
  },
  ipLeft: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "space-between",
    paddingRight: Spacing.md,
    flexShrink: 1,
  },
  ipRight: {
    width: 140,
    alignSelf: "stretch",
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
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 20,
  },
  ipMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
    marginBottom: 6,
  },
  ipMetaText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  ipMetaDot: {
    color: Colors.textSecondary,
    marginHorizontal: 3,
  },
  ipSubtitle: {
    ...TextStyles.caption,
    marginBottom: 4,
  },
  ipPercentRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap",
    marginVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  ipPercentText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },

  // progress bar
  pbTrack: {
    height: 5,
    backgroundColor: Colors.progressTrack,
    borderRadius: BorderRadius.base,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  pbFill: {
    height: "100%",
    backgroundColor: Colors.progressFill,
    borderRadius: BorderRadius.base,
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
});
