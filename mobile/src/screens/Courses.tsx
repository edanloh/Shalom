import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useCourses } from "../contexts/CourseContext";
import { useUser } from "../contexts/UserContext";
import courseService from "../services/courseService";
import { Colors, Spacing, TextStyles, Typography } from "../constants";
import type { Course } from "../types";
import { ImageWithFallback } from "@components/common";
import { Images } from "../../assets";
import Screen from "../components/common/Screen";
import CourseCard from "../components/home/CourseCard";
import { CustomTextInput } from "@/components";
import screenStyles from "@/styles/styles";
import { getAllCategories, type Category } from "../services/courseService";
import { formatPrimaryRecommendationReason } from "../utils/recommendations";

const { width } = Dimensions.get("window");

const CARD_BG = "#3A3A45";
const CHIP_BORDER = "#4B4B57";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function progressFrom(course: Course): number {
  const anyCourse = course as any;
  const p: any =
    anyCourse?.progress ??
    anyCourse?.progress_percentage ??
    anyCourse?.progressPercent;
  if (p == null) return 0;
  if (typeof p === "number") {
    // if looks like 0..100, convert
    return p > 1 ? clamp01(p / 100) : clamp01(p);
  }
  const candidates = [p.percent, p.percentage, p.progress, p.value].filter(
    (v) => typeof v === "number",
  ) as number[];

  if (!candidates.length) return 0;
  const v = candidates[0];
  return v > 1 ? clamp01(v / 100) : clamp01(v);
}

export default function CoursesScreen({ navigation }: any) {
  const {
    courses = [],
    recommendedCourses = [],
    loading,
    recommendedLoading,
    refreshCourses,
    refreshRecommended,
    wishlist = [],
    toggleWishlist,
  } = useCourses();

  const wishIds = useMemo(() => new Set(wishlist.map((c) => c.id)), [wishlist]);
  const isWishlisted = (c: Course) => wishIds.has(c.id);
  const { enrolledCourses = [], user: profileUser } = useUser();
  const recommendationUserId = profileUser?.uuid;

  // UI state
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Build category chips with "All" option
  const categoryChips: string[] = useMemo(() => {
    return ["All", ...categories.map((cat) => cat.name)];
  }, [categories]);

  // Search helper (title, instructor, category)
  const searchLocal = (q: string, list: Course[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((c) => {
      const inTitle = c.title?.toLowerCase().includes(t);
      const inInstr = c.instructor?.name?.toLowerCase().includes(t);
      const inCat = c.category?.toLowerCase().includes(t);
      return inTitle || inInstr || inCat;
    });
  };

  // Partition lists
  const enrolledIds = new Set<string>(enrolledCourses as string[]);

  const jumpBackIn = useMemo(
    () => courses.filter((c) => enrolledIds.has(c.id)),
    [courses, enrolledIds],
  );

  const recommended = useMemo(() => {
    if (query) return [];
    if (recommendedCourses.length) return recommendedCourses;
    return courses.filter((c) => !enrolledIds.has(c.id)).slice(0, 10);
  }, [courses, enrolledIds, query, recommendedCourses]);

  const popular = useMemo(() => {
    // Not enrolled, filtered by category and query
    let base = courses.filter((c) => !enrolledIds.has(c.id));
    if (selectedCategory !== "All") {
      base = base.filter((c) => c.category === selectedCategory);
    }
    base = searchLocal(query, base);
    return base;
  }, [courses, enrolledIds, selectedCategory, query]);

  // ---- small UI bits ----
  const MetaRow = ({
    rating,
    modules,
  }: {
    rating: number;
    modules?: number;
  }) => (
    <>
      <View style={styles.metaRow}>
        <Ionicons name="star" size={12} color="#FACC15" />
        <Text style={styles.metaText}>{rating?.toFixed?.(1) ?? rating}</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaText}>{modules ?? 12} modules</Text>
      </View>
    </>
  );

  const ProgressBar = ({ value }: { value: number }) => {
    const pct = clamp01(value);
    return (
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
    );
  };

  const [refreshing, setRefreshing] = useState(false);
  const lastScrollY = useRef(0);
  const tabHidden = useRef(false);
  const lastRecommendedImpressionKey = useRef<string>("");

  const handleRecommendedCourseClick = useCallback(
    (course: Course) => {
      if (recommendationUserId) {
        courseService
          .recordRecommendationEvent({
            userId: recommendationUserId,
            courseId: course.id,
            eventType: "click",
            requestId: course.recommendationRequestId,
            context: {
              placement: "courses_recommended",
              isRecommendationSurface: true,
              modelVersion: course.recommendationModelVersion,
              requestId: course.recommendationRequestId,
            },
          })
          .catch((err) =>
            console.warn("Failed to record courses rec click", err)
          );
      }
      navigation.navigate("CourseDetail", { courseId: course.id });
    },
    [navigation, recommendationUserId]
  );

  const onRefresh = useCallback(async () => {
    if (!refreshCourses) return;
    try {
      setRefreshing(true);
      await Promise.all([
        refreshCourses?.(),
        refreshRecommended?.(),
        fetchCategories(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCourses, refreshRecommended, fetchCategories]);

  const BadgeHeartRow = ({ item }: { item: Course }) => (
    <View style={styles.badgeRow}>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          toggleWishlist?.(item);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          isWishlisted(item) ? "Remove from wishlist" : "Add to wishlist"
        }
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        style={styles.heartBtn}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isWishlisted(item) ? "heart" : "heart-outline"}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );

  const HCard = ({
    item,
    withProgress,
    trackRecommendation = false,
    placement = "courses_recommended",
  }: {
    item: Course;
    withProgress?: boolean;
    trackRecommendation?: boolean;
    placement?: string;
  }) => {
    const rankLabel =
      item.recommendationRank || item.recommendationScore
        ? `#${item.recommendationRank ?? "?"} • ${Number(
            item.recommendationScore ?? 0,
          ).toFixed(1)}`
        : null;
    const reason = formatPrimaryRecommendationReason(
      item.recommendationPrimaryTag
    );

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (trackRecommendation && recommendationUserId) {
            courseService
              .recordRecommendationEvent({
                userId: recommendationUserId,
                courseId: item.id,
                eventType: "click",
                requestId: item.recommendationRequestId,
                context: {
                  placement,
                  isRecommendationSurface: true,
                  modelVersion: item.recommendationModelVersion,
                  requestId: item.recommendationRequestId,
                },
              })
              .catch((err) =>
                console.warn("Failed to record courses rec click", err)
              );
          }
          navigation.navigate("CourseDetail", { courseId: item.id });
        }}
        style={styles.hCard}
      >
        <View style={styles.imageWrap}>
          <ImageWithFallback
            source={{ uri: item.image }}
            fallback={Images.placeholder}
            style={styles.hImage}
          />
          <BadgeHeartRow item={item} />
          {rankLabel ? (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rankLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.hTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <MetaRow rating={item.rating} modules={item.modules} />
        {reason ? (
          <Text style={styles.reason} numberOfLines={1}>
            {reason}
          </Text>
        ) : null}
        {withProgress ? (
          <View style={{ marginTop: 8 }}>
            <ProgressBar value={progressFrom(item)} />
            <Text style={styles.progressLabel}>
              {Math.round(progressFrom(item) * 100)}% complete
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const GCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (recommendationUserId) {
          courseService
            .recordRecommendationEvent({
              userId: recommendationUserId,
              courseId: item.id,
              eventType: "click",
              context: {
                placement: "courses_popular",
                isRecommendationSurface: false,
              },
            })
            .catch((err) =>
              console.warn("Failed to record popular course click", err)
            );
        }
        navigation.navigate("CourseDetail", { courseId: item.id });
      }}
      style={styles.gCard}
    >
      <View style={styles.imageWrap}>
        <ImageWithFallback
          source={{ uri: item.image }}
          fallback={Images.placeholder}
          style={styles.gImage}
        />
        <BadgeHeartRow item={item} />
      </View>
      <View style={[styles.catBadge, { backgroundColor: item.categoryColor }]}>
        <Text
          style={[TextStyles.bodySmall, styles.catBadgeText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.category}
        </Text>
      </View>
      <Text style={styles.gTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <MetaRow rating={item.rating} modules={item.modules} />
    </TouchableOpacity>
  );

  const EmptyState = ({
    icon = "sparkles-outline",
    message,
    subtext,
  }: {
    icon?: keyof typeof Ionicons.glyphMap;
    message: string;
    subtext?: string;
  }) => (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={28} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>{message}</Text>
      {subtext ? <Text style={styles.emptySubtitle}>{subtext}</Text> : null}
    </View>
  );

  useEffect(() => {
    if (query) return;
    if (!recommendationUserId || recommended.length === 0) return;
    const firstRecommendation = recommended[0];

    const impressionKey = [
      recommendationUserId,
      firstRecommendation?.recommendationRequestId || "no_request_id",
      ...recommended.map((c) => c.id),
    ].join("|");
    if (lastRecommendedImpressionKey.current === impressionKey) return;
    lastRecommendedImpressionKey.current = impressionKey;

    courseService
      .recordRecommendationEvent({
        userId: recommendationUserId,
        eventType: "impression",
        requestId: firstRecommendation.recommendationRequestId,
        context: {
          placement: "courses_recommended",
          isRecommendationSurface: true,
          courseIds: recommended.map((c) => c.id),
          modelVersion: firstRecommendation.recommendationModelVersion,
          requestId: firstRecommendation.recommendationRequestId,
        },
      })
      .catch((err) =>
        console.warn("Failed to record courses rec impression", err)
      );
  }, [query, recommended, recommendationUserId]);

  return (
    <Screen
      title="Browse Courses"
      customEdges={["top"]}
      disableChildrenWrapper
      useScrollView={false}
    >
      <ScrollView
        contentContainerStyle={screenStyles.fullScrollContent}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
            colors={[Colors.secondary]}
          />
        }
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const dy = y - lastScrollY.current;
          if (Math.abs(dy) < 8) return;
          if (dy > 0 && y > 40 && !tabHidden.current) {
            tabHidden.current = true;
            DeviceEventEmitter.emit("tabbar:toggle", { visible: false });
          } else if (dy < 0 && tabHidden.current) {
            tabHidden.current = false;
            DeviceEventEmitter.emit("tabbar:toggle", { visible: true });
          }
          lastScrollY.current = y;
        }}
      >
        <View style={styles.stickyControls}>
          {/* Search */}
          <CustomTextInput
            placeholder="Search for courses"
            value={query}
            onChangeText={setQuery}
            autoCapitalize={"none"}
            leftIconName="search"
            returnKeyType="search"
          />

          {/* Category chips from API */}
          {categoriesLoading ? (
            <View style={styles.chipsLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.purple400} />
            </View>
          ) : (
            <FlatList
              data={categoryChips}
              keyExtractor={(t) => t}
              renderItem={({ item }) => {
                const active = item === selectedCategory;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(item)}
                    activeOpacity={0.8}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              style={styles.chipsList}
            />
          )}
        </View>

        <View style={styles.contentWrap}>
          {/* Jump Back In */}
          {jumpBackIn.length > 0 && (
            <>
              <Text style={[TextStyles.h4, { marginVertical: Spacing.sm }]}>
                Jump Back In
              </Text>
              <FlatList<Course>
                data={jumpBackIn}
                keyExtractor={(i, index) =>
                  String(i.id ?? `jump-back-${index}-${i.title ?? "course"}`)
                }
                renderItem={({ item }) => <HCard item={item} withProgress />}
                horizontal
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.hRow}
                extraData={wishlist}
              />
            </>
          )}

          {/* Recommended (not enrolled) */}
          {!query && (
            <>
              <Text style={[TextStyles.h4, { marginVertical: Spacing.sm }]}>
                Recommended
              </Text>

              {recommendedLoading || refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.purple400} />
                  <Text style={styles.loadingText}>Loading recommended…</Text>
                </View>
              ) : recommended.length ? (
                <FlatList<Course>
                  data={recommended}
                  keyExtractor={(i, index) =>
                    String(i.id ?? `recommended-${index}-${i.title ?? "course"}`)
                  }
                  renderItem={({ item }) => (
                    <CourseCard
                      course={item}
                      variant="compact"
                      showInstructor={false}
                      onPress={handleRecommendedCourseClick}
                    />
                  )}
                  horizontal
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                  style={styles.hList}
                  extraData={wishlist}
                />
              ) : (
                <EmptyState
                  icon="sparkles-outline"
                  message="No recommendations right now."
                  subtext="Pull down to refresh."
                />
              )}
            </>
          )}

          {/* Popular Courses (clean grid, not enrolled, category + query filtered) */}
          <Text style={[TextStyles.h4, { marginVertical: Spacing.sm }]}>
            Popular Courses
          </Text>
          {loading || refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.purple400} />
              <Text style={styles.loadingText}>Loading popular courses…</Text>
            </View>
          ) : popular.length ? (
            <FlatList<Course>
              data={popular}
              keyExtractor={(i, index) =>
                String(i.id ?? `popular-${index}-${i.title ?? "course"}`)
              }
              renderItem={({ item }) => <GCard item={item} />}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between" }}
              scrollEnabled={false}
              extraData={wishlist}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              message="No courses match your filters"
              subtext="Pull down to refresh."
            />
          )}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Chips
  chipsRow: {
    paddingBottom: Spacing.sm,
  },
  chipsList: {
    maxHeight: 48,
    marginTop: Spacing.sm,
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  chipsLoadingContainer: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  stickyControls: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  contentWrap: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  hList: {
    marginHorizontal: -Spacing.xl,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CHIP_BORDER,
    marginRight: 10,
    height: 38,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: Colors.purple400,
    borderColor: Colors.purple400,
    height: 38,
    justifyContent: "center",
  },
  chipText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
    fontFamily: TextStyles.body.fontFamily,
  },
  chipTextActive: {
    color: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl,
    minHeight: 200,
  },
  loadingText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 120,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    marginTop: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
    textAlign: "center",
  },

  // Horizontal cards
  hRow: {
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  hCard: {
    width: Math.min(width * 0.72, 300),
    marginRight: 12,
    backgroundColor: "transparent",
    borderRadius: 16,
  },
  hImage: {
    width: "100%",
    height: 150,
    backgroundColor: CARD_BG,
  },
  hTitle: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    marginTop: 10,
    paddingHorizontal: 2,
    fontFamily: TextStyles.body.fontFamily,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: TextStyles.body.fontFamily,
  },
  metaDot: { color: Colors.textSecondary, marginHorizontal: 4 },
  rankBadge: {
    position: "absolute",
    left: Spacing.sm,
    top: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  catBadge: {
    alignSelf: "flex-start",
    marginTop: Spacing.md,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 96,
  },
  catBadgeText: {
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  rankText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },

  // Progress
  progressWrap: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#4B4B57",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: Colors.purple400,
  },
  progressLabel: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: TextStyles.body.fontFamily,
  },

  // Grid cards (Popular)
  gCard: {
    width: (width - Spacing.lg * 2 - Spacing.lg) / 2,
    backgroundColor: "transparent",
    borderRadius: 16,
    marginBottom: Spacing["2xl"],
  },
  gImage: {
    width: "100%",
    height: (width - Spacing.lg * 2 - Spacing.lg) / 5,
    backgroundColor: CARD_BG,
  },
  gTitle: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 14.5,
    paddingHorizontal: 2,
    paddingTop: 10,
    fontFamily: TextStyles.body.fontFamily,
  },
  gInstructor: {
    color: Colors.textSecondary,
    fontSize: 12.5,
    paddingHorizontal: 2,
    paddingTop: 4,
    fontFamily: TextStyles.body.fontFamily,
  },
  imageWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  badgeRow: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heartBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },
  reason: {
    color: Colors.purple200,
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 2,
    fontFamily: TextStyles.body.fontFamily,
  },
});
