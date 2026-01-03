import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useCourses } from "../contexts/CourseContext";
import { useUser } from "../contexts/UserContext";
import { Colors, Spacing, TextStyles } from "../constants";
import type { Course } from "../types";
import { ImageWithFallback } from "@components/common";
import { Images } from "../../assets";
import Screen from "../components/common/Screen";
import { CustomTextInput } from "@/components";
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
  const p: any = course?.progress;
  if (p == null) return 0;
  if (typeof p === "number") {
    // if looks like 0..100, convert
    return p > 1 ? clamp01(p / 100) : clamp01(p);
  }
  const candidates = [p.percent, p.percentage, p.progress, p.value].filter(
    (v) => typeof v === "number"
  ) as number[];

  if (!candidates.length) return 0;
  const v = candidates[0];
  return v > 1 ? clamp01(v / 100) : clamp01(v);
}

export default function CoursesScreen({ navigation }: any) {
  const {
    courses = [],
    loading,
    refreshCourses,
    wishlist = [],
    toggleWishlist,
  } = useCourses();

  const wishIds = useMemo(() => new Set(wishlist.map((c) => c.id)), [wishlist]);
  const isWishlisted = (c: Course) => wishIds.has(c.id);
  const { enrolledCourses = [] } = useUser();

  // UI state
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");

  // Build unique tag chips from all courses
  const tagChips: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      (c.tags ?? []).forEach((t) => t && set.add(t));
    }
    return ["All", ...Array.from(set)];
  }, [courses]);

  // Search helper (title, instructor, category, tags)
  const searchLocal = (q: string, list: Course[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((c) => {
      const inTitle = c.title?.toLowerCase().includes(t);
      const inInstr = c.instructor?.name?.toLowerCase().includes(t);
      const inCat = c.category?.toLowerCase().includes(t);
      const inTags = (c.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(t)
      );
      return inTitle || inInstr || inCat || inTags;
    });
  };

  // Partition lists
  const enrolledIds = new Set<string>(enrolledCourses as string[]);

  const jumpBackIn = useMemo(
    () => courses.filter((c) => enrolledIds.has(c.id)),
    [courses, enrolledIds]
  );

  const recommended = useMemo(() => {
    if (query) return [];
    // simple: first few not-enrolled
    return courses.filter((c) => !enrolledIds.has(c.id)).slice(0, 10);
  }, [courses, enrolledIds, query]);

  const popular = useMemo(() => {
    // Not enrolled, filtered by tag and query
    let base = courses.filter((c) => !enrolledIds.has(c.id));
    if (selectedTag !== "All") {
      base = base.filter((c) => (c.tags ?? []).includes(selectedTag));
    }
    base = searchLocal(query, base);
    return base;
  }, [courses, enrolledIds, selectedTag, query]);

  // ---- small UI bits ----
  const MetaRow = ({
    rating,
    modules,
  }: {
    rating: number;
    modules?: number;
  }) => (
    <View style={styles.metaRow}>
      <Ionicons name="star" size={12} color="#FACC15" />
      <Text style={styles.metaText}>{rating?.toFixed?.(1) ?? rating}</Text>
      <Text style={styles.metaDot}>•</Text>
      <Text style={styles.metaText}>{modules ?? 12} modules</Text>
    </View>
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

  const onRefresh = useCallback(async () => {
    if (!refreshCourses) return;
    try {
      setRefreshing(true);
      await refreshCourses();
    } finally {
      setRefreshing(false);
    }
  }, [refreshCourses]);

  const BadgeHeartRow = ({ item }: { item: Course }) => (
    <View style={styles.badgeRow}>
      {/* <View style={styles.levelBadge}>
        <Text style={styles.levelText}>{item.level}</Text>
      </View> */}
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
  }: {
    item: Course;
    withProgress?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate("CourseDetail", { courseId: item.id })}
      style={styles.hCard}
    >
      <View style={styles.imageWrap}>
        <ImageWithFallback
          source={{ uri: item.image }}
          fallback={Images.placeholder}
          style={styles.hImage}
        />
        <BadgeHeartRow item={item} />
      </View>
      <Text style={styles.hTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <MetaRow rating={item.rating} modules={item.modules} />
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

  const GCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate("CourseDetail", { courseId: item.id })}
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
      <Text style={styles.gTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <MetaRow rating={item.rating} modules={item.modules} />
      {/* <Text style={styles.gInstructor} numberOfLines={1}>
        {item.instructor?.name ? `Mr. ${item.instructor.name}` : ""}
      </Text> */}
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

  return (
    <Screen
      title="Browse Courses"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
        {/* Search */}
        <CustomTextInput
          placeholder="Search for courses"
          value={query}
          onChangeText={setQuery}
          autoCapitalize={"none"}
          leftIconName="search"
          returnKeyType="search"
        />

        {/* Tag chips (from course.tags, no duplicates) */}
        <FlatList
          data={tagChips}
          keyExtractor={(t) => t}
          renderItem={({ item }) => {
            const active = item === selectedTag;
            return (
              <TouchableOpacity
                onPress={() => setSelectedTag(item)}
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
          style={{ maxHeight: 48, marginTop: Spacing.sm }}
        />

        {/* Jump Back In */}
        {jumpBackIn.length > 0 && (
          <>
            <Text style={[TextStyles.h4, {marginVertical: Spacing.sm}]}>Jump Back In</Text>
            <FlatList<Course>
              data={jumpBackIn}
              keyExtractor={(i) => i.id}
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
            <Text style={[TextStyles.h4, {marginVertical: Spacing.sm}]}>
              Recommended
            </Text>

            {loading || refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.purple400} />
                <Text style={styles.loadingText}>Loading recommended…</Text>
              </View>
            ) : recommended.length ? (
              <FlatList<Course>
                data={recommended}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => <HCard item={item} />}
                horizontal
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.hRow}
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

        {/* Popular Courses (clean grid, not enrolled, tag + query filtered) */}
        <Text style={[TextStyles.h4, {marginVertical: Spacing.sm}]}>
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
            keyExtractor={(i) => i.id}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Chips
  chipsRow: {
    paddingBottom: Spacing.sm,
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
  hRow: { paddingBottom: Spacing.sm },
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
    width: (width - Spacing.lg * 2 - 32) / 2,
    backgroundColor: "transparent",
    borderRadius: 16,
    marginBottom: Spacing.lg,
    marginRight: Spacing.base, 
  },
  gImage: {
    width: "100%",
    height: 110,
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
  levelBadge: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  levelText: {
    color: Colors.white,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 11,
    fontWeight: "700",
  },
  heartBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },
});
