import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
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

function BadgeHeartRow({ item }: { item: Course }) {
  const { wishlist = [], toggleWishlist } = useCourses();
  const isWishlisted = wishlist.some((c) => c.id === item.id);
  return (
    <View style={styles.badgeRow}>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          toggleWishlist?.(item);
        }}
        accessibilityRole="button"
        accessibilityLabel={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        style={styles.heartBtn}
        activeOpacity={0.7}
      >
        <Ionicons name={isWishlisted ? "heart" : "heart-outline"} size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function HCard({
  item,
  navigation,
  withProgress,
  trackRecommendation = false,
  placement = "courses_recommended",
}: {
  item: Course;
  navigation: any;
  withProgress?: boolean;
  trackRecommendation?: boolean;
  placement?: string;
}) {
  const { recordRecommendationEvent } = useCourses();
  const rankLabel = Number.isFinite(item.recommendationRank) ? `#${item.recommendationRank}` : null;
  const reason = formatPrimaryRecommendationReason(item.recommendationPrimaryTag);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (trackRecommendation) {
          recordRecommendationEvent(item.id, "click", placement)
            .catch((err) => console.warn("Failed to record courses rec click", err));
        }
        navigation.navigate("CourseDetail", { courseId: item.id, sourceScreen: "Courses" });
      }}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
      style={[styles.hCard, animatedStyle]}
    >
      <View style={styles.imageWrap}>
        <ImageWithFallback source={{ uri: item.image }} fallback={Images.placeholder} style={styles.hImage} />
        <BadgeHeartRow item={item} />
        {rankLabel ? (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rankLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.hTitle} numberOfLines={2}>{item.title}</Text>
      <MetaRow rating={item.rating} modules={item.modules} />
      {reason ? <Text style={styles.reason} numberOfLines={1}>{reason}</Text> : null}
      {withProgress ? (
        <View style={{ marginTop: 8, paddingBottom: Spacing.sm }}>
          <ProgressBar value={progressFrom(item)} />
          <Text style={styles.progressLabel}>{Math.round(progressFrom(item) * 100)}% complete</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

function GCard({ item, navigation, enrolledIds }: { item: Course; navigation: any; enrolledIds: Set<string> }) {
  const { recordRecommendationEvent } = useCourses();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={() => {
        recordRecommendationEvent(item.id, "click", "courses_popular")
          .catch((err) => console.warn("Failed to record popular course click", err));
        navigation.navigate("CourseDetail", { courseId: item.id, sourceScreen: "Courses" });
      }}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
      style={[styles.gCard, animatedStyle]}
    >
      <View style={styles.imageWrap}>
        <ImageWithFallback source={{ uri: item.image }} fallback={Images.placeholder} style={styles.gImage} />
        <BadgeHeartRow item={item} />
        {enrolledIds.has(String(item.id)) && (
          <View style={styles.enrolledBadge}>
            <Text style={styles.enrolledBadgeText}>Enrolled</Text>
          </View>
        )}
      </View>
      <View style={[styles.catBadge, { backgroundColor: item.categoryColor }]}>
        <Text style={[TextStyles.bodySmall, styles.catBadgeText]} numberOfLines={1} ellipsizeMode="tail">
          {item.category}
        </Text>
      </View>
      <Text style={styles.gTitle} numberOfLines={2}>{item.title}</Text>
      <MetaRow rating={item.rating} modules={item.modules} />
    </AnimatedPressable>
  );
}

export default function CoursesScreen({ navigation }: any) {
  const {
    myCourses = [],
    recommendedCourses = [],
    loading,
    recommendedLoading,
    refreshCourses,
    refreshRecommended,
    wishlist = [],
    toggleWishlist,
    recordRecommendationEvent,
} = useCourses();

  const PAGE_SIZE = 24;

  const wishIds = useMemo(() => new Set(wishlist.map((c) => c.id)), [wishlist]);
  const isWishlisted = (c: Course) => wishIds.has(c.id);
  const { enrolledCourses = [] } = useUser();

  // UI state
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogHasMore, setCatalogHasMore] = useState(true);
  const [catalogOffset, setCatalogOffset] = useState(0);

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

  const loadCatalogPage = useCallback(
    async ({ reset = false, offset }: { reset?: boolean; offset?: number } = {}) => {
      const startOffset = reset ? 0 : (offset ?? catalogOffset);
      if (!reset && (catalogLoading || catalogLoadingMore || !catalogHasMore)) return;

      if (reset) {
        setCatalogLoading(true);
      } else {
        setCatalogLoadingMore(true);
      }

      try {
        const result = await courseService.getPublishedCoursesPage({
          limit: PAGE_SIZE,
          offset: startOffset,
          sortBy: "updated_at",
          sortOrder: "desc",
        });

        setCatalogCourses((prev) => {
          if (reset) return result.courses;
          const existing = new Set(prev.map((course) => course.id));
          return [...prev, ...result.courses.filter((course) => !existing.has(course.id))];
        });
        setCatalogOffset(startOffset + result.courses.length);
        setCatalogHasMore(result.pagination.hasMore);
      } catch (error) {
        console.error("Error loading course catalog:", error);
      } finally {
        if (reset) {
          setCatalogLoading(false);
        } else {
          setCatalogLoadingMore(false);
        }
      }
    },
    [catalogHasMore, catalogLoading, catalogLoadingMore, catalogOffset, PAGE_SIZE]
  );

  useEffect(() => {
    loadCatalogPage({ reset: true });
  }, []);

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
  // Prefer backend-derived enrollments from myCourses and keep UserContext as fallback.
  const enrolledIds = useMemo(() => {
    const ids = new Set<string>();

    myCourses.forEach((course) => {
      if (course?.id != null) ids.add(String(course.id));
    });

    (enrolledCourses as any[]).forEach((courseOrId) => {
      if (courseOrId == null) return;
      if (typeof courseOrId === "string" || typeof courseOrId === "number") {
        ids.add(String(courseOrId));
        return;
      }
      if (typeof courseOrId === "object" && (courseOrId as any).id != null) {
        ids.add(String((courseOrId as any).id));
      }
    });

    return ids;
  }, [myCourses, enrolledCourses]);

  const jumpBackIn = useMemo(() => {
    const source = myCourses.length ? myCourses : catalogCourses;
    return source.filter((c) => enrolledIds.has(String(c.id)));
  }, [myCourses, catalogCourses, enrolledIds]);

  const recommended = useMemo(() => {
    if (query) return [];
    if (recommendedCourses.length) {
      return recommendedCourses.filter((c) => !enrolledIds.has(String(c.id)));
    }
    return catalogCourses.filter((c) => !enrolledIds.has(String(c.id))).slice(0, 10);
  }, [catalogCourses, enrolledIds, query, recommendedCourses]);

  const allCoursesForResults = useMemo(() => {
    const merged = [...catalogCourses, ...myCourses];
    const deduped = new Map<string, Course>();
    merged.forEach((course) => {
      if (!course?.id) return;
      deduped.set(String(course.id), course);
    });
    return Array.from(deduped.values());
  }, [catalogCourses, myCourses]);

  const popular = useMemo(() => {
    // All courses (including enrolled), filtered by category and query
    let base = allCoursesForResults;
    if (selectedCategory !== "All") {
      base = base.filter((c) => c.category === selectedCategory);
    }
    base = searchLocal(query, base);
    return base;
  }, [allCoursesForResults, selectedCategory, query]);

  const showDiscoverySections = selectedCategory === "All";

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.trim() && selectedCategory !== "All") {
      setSelectedCategory("All");
    }
  };

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
      recordRecommendationEvent(course.id, 'click', 'courses_recommended')
        .then(() => refreshRecommended?.().catch(() => {}))
        .catch((err) => console.warn("Failed to record courses rec click", err));
      navigation.navigate("CourseDetail", { courseId: course.id, sourceScreen: "Courses" });
    },
    [navigation, recordRecommendationEvent, refreshRecommended]
  );

  const onRefresh = useCallback(async () => {
    if (!refreshCourses) return;
    try {
      setRefreshing(true);
      await Promise.all([
        refreshCourses?.(),
        refreshRecommended?.(),
        fetchCategories(),
        loadCatalogPage({ reset: true }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCourses, refreshRecommended, fetchCategories, loadCatalogPage]);


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
    if (recommended.length === 0) return;

    const impressionKey = [
      recommended[0]?.recommendationRequestId || "no_request_id",
      ...recommended.map((c) => c.id),
    ].join("|");
    if (lastRecommendedImpressionKey.current === impressionKey) return;
    lastRecommendedImpressionKey.current = impressionKey;

    // Fire per-course impressions via context so score_breakdown is attached
    recommended.forEach((course) => {
      recordRecommendationEvent(course.id, 'impression', 'courses_recommended')
        .catch(() => {});
    });
  }, [query, recommended, recordRecommendationEvent]);

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
            onChangeText={handleSearchChange}
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
          {showDiscoverySections && !query.trim() && jumpBackIn.length > 0 && (
            <>
              <Text style={[TextStyles.h4, { marginVertical: Spacing.sm }]}>
                Jump Back In
              </Text>
              <FlatList<Course>
                data={jumpBackIn}
                keyExtractor={(i, index) =>
                  String(i.id ?? `jump-back-${index}-${i.title ?? "course"}`)
                }
                renderItem={({ item }) => <HCard item={item} navigation={navigation} withProgress />}
                horizontal
                showsVerticalScrollIndicator={false}
                style={styles.hList}
                contentContainerStyle={styles.hRow}
                extraData={wishlist}
              />
            </>
          )}

          {/* Recommended (not enrolled) */}
          {showDiscoverySections && !query && (
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
                      showRecommendationReason={true}
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

          {/* All Courses / Results (clean grid, not enrolled, category + query filtered) */}
          <Text style={[TextStyles.h4, { marginVertical: Spacing.sm }]}>
            {query.trim() || selectedCategory !== "All" ? "Results" : "All Courses"}
          </Text>
          {catalogLoading || loading || refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.purple400} />
              <Text style={styles.loadingText}>Loading courses…</Text>
            </View>
          ) : popular.length ? (
            <FlatList<Course>
              data={popular}
              keyExtractor={(i, index) =>
                String(i.id ?? `popular-${index}-${i.title ?? "course"}`)
              }
              renderItem={({ item }) => <GCard item={item} navigation={navigation} enrolledIds={enrolledIds} />}
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
          {catalogHasMore ? (
            <View style={styles.paginationFooter}>
              {catalogLoadingMore ? (
                <ActivityIndicator size="small" color={Colors.purple400} />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => loadCatalogPage({ offset: catalogOffset })}
                  style={styles.loadMoreButton}
                >
                  <Text style={styles.loadMoreButtonText}>Load more courses</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
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
  paginationFooter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  loadMoreButton: {
    minWidth: 180,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.purple400,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonText: {
    color: Colors.white,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
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
  enrolledBadge: {
    position: "absolute",
    left: Spacing.sm,
    top: Spacing.sm,
    backgroundColor: "rgba(34,197,94,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  enrolledBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: TextStyles.body.fontFamily,
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
