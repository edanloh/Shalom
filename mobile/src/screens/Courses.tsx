import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCourses } from '../contexts/CourseContext';
import { useUser } from '../contexts/UserContext';
import { Colors, Spacing, TextStyles } from '../constants';
import type { Course } from '../types';

const { width } = Dimensions.get('window');

const CARD_BG = '#3A3A45';
const CHIP_BORDER = '#4B4B57';

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function progressFrom(course: Course): number {
  const p: any = course?.progress;
  if (p == null) return 0;
  if (typeof p === 'number') {
    // if looks like 0..100, convert
    return p > 1 ? clamp01(p / 100) : clamp01(p);
  }
  const candidates = [
    p.percent,
    p.percentage,
    p.progress,
    p.value,
  ].filter((v) => typeof v === 'number') as number[];

  if (!candidates.length) return 0;
  const v = candidates[0];
  return v > 1 ? clamp01(v / 100) : clamp01(v);
}

export default function CoursesScreen({ navigation }: any) {
  const {
    courses = [],
    coursesLoading = false,
    refreshCourses,
  } = useCourses() as {
    courses: Course[];
    coursesLoading?: boolean;
    coursesError?: string | null;
    refreshCourses?: () => Promise<void>;
  };
  const { enrolledCourses = [] } = useUser();

  // UI state
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // Build unique tag chips from all courses
  const tagChips: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      (c.tags ?? []).forEach((t) => t && set.add(t));
    }
    return ['All', ...Array.from(set)];
  }, [courses]);

  // Search helper (title, instructor, category, tags)
  const searchLocal = (q: string, list: Course[]) => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((c) => {
      const inTitle = c.title?.toLowerCase().includes(t);
      const inInstr = c.instructor?.name?.toLowerCase().includes(t);
      const inCat = c.category?.toLowerCase().includes(t);
      const inTags = (c.tags ?? []).some((tag) => tag.toLowerCase().includes(t));
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
    if (selectedTag !== 'All') {
      base = base.filter((c) => (c.tags ?? []).includes(selectedTag));
    }
    base = searchLocal(query, base);
    return base;
  }, [courses, enrolledIds, selectedTag, query]);

  // ---- small UI bits ----
  const MetaRow = ({ rating, modules }: { rating: number; modules?: number }) => (
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

  const HCard = ({
    item,
    withProgress,
  }: {
    item: Course;
    withProgress?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
      style={styles.hCard}
    >
      <Image source={{ uri: item.image }} style={styles.hImage} />
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
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
      style={styles.gCard}
    >
      <Image source={{ uri: item.image }} style={styles.gImage} />
      <Text style={styles.gTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <MetaRow rating={item.rating} modules={item.modules} />
      <Text style={styles.gInstructor} numberOfLines={1}>
        {item.instructor?.name ? `Mr. ${item.instructor.name}` : ''}
      </Text>
    </TouchableOpacity>
  );

  const EmptyState = ({
    icon = 'sparkles-outline',
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.lg * 2 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.white}            // iOS spinner color
            colors={[Colors.purple400]}         // Android spinner colors
          />
        }
          alwaysBounceVertical={true}           // iOS
          overScrollMode="always"               // Android    
      >
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for courses"
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={{ marginTop: 4 }}
        />

        {/* Jump Back In */}
        {jumpBackIn.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Jump Back In</Text>
            <FlatList<Course>
              data={jumpBackIn}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <HCard item={item} withProgress />}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hRow}
            />
          </>
        )}

        {/* Recommended (not enrolled) */}
        {!query && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>
              Recommended
            </Text>

            {(coursesLoading || refreshing) ? (
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
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hRow}
              />
            ) : (
              <EmptyState icon="sparkles-outline" message="No recommendations right now." subtext="Pull down to refresh."/>
            )}
          </>
        )}

        {/* Popular Courses (clean grid, not enrolled, tag + query filtered) */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.sm }]}>
          Popular Courses
        </Text>
        {(coursesLoading || refreshing) ? (
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
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={styles.grid}
            scrollEnabled={false}
          />
        ) : (
          <EmptyState icon="search-outline" message="No courses match your filters" subtext="Pull down to refresh."/>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: TextStyles.h4.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  // Search
  searchWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: '#3A3C46',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    marginLeft: 8,
    fontSize: TextStyles.body.fontSize,
    fontFamily: TextStyles.body.fontFamily,
  },

  // Chips
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CHIP_BORDER,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: Colors.purple400,
    borderColor: Colors.purple400,
  },
  chipText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
    fontFamily: TextStyles.body.fontFamily,
  },
  chipTextActive: {
    color: '#fff',
  },

  // Section title
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: Spacing.lg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 120,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },

  // Horizontal cards
  hRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  hCard: {
    width: Math.min(width * 0.72, 300),
    marginRight: 12,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  hImage: {
    width: '100%',
    height: 150,
    borderRadius: 16, // image has its own rounded container
    backgroundColor: CARD_BG,
  },
  hTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 10,
    paddingHorizontal: 2,
    fontFamily: TextStyles.body.fontFamily,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TextStyles.body.fontFamily,
  },
  metaDot: { color: Colors.textSecondary, marginHorizontal: 4 },

  // Progress
  progressWrap: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#4B4B57',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  gCard: {
    width: (width - Spacing.lg * 2 - 12) / 2,
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginBottom: 12,
  },
  gImage: {
    width: '100%',
    height: 110,
    borderRadius: 16,
    backgroundColor: CARD_BG,
  },
  gTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
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
});