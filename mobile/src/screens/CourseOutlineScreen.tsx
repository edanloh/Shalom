// src/screens/CourseOutline.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, TextStyles } from '../constants';
import type { MainStackParamList } from '../types/navigation';
import {
  courseDetailService,
  type ProcessedCourseDetail,
  type CourseModule,
} from '../services/courseDetailService';
import {
  moduleService,
  type ModuleDetailResponse,
} from '../services/moduleService';
import { useAuth } from '../contexts/AuthContext';

type Props = StackScreenProps<MainStackParamList, 'CourseOutline'>;
type CourseContent = ModuleDetailResponse['data'];

const CourseOutlineScreen: React.FC<Props> = ({ navigation, route }) => {
  const { courseId, startAt } = route.params;

  const { user } = useAuth();
  const userId = user?.id || null;

  const [detail, setDetail] = useState<ProcessedCourseDetail | null>(null);
  const [content, setContent] = useState<CourseContent | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch course detail first
      const d = await courseDetailService.getCourseDetail(courseId);

      // Then (optionally) fetch module detail with user progress
      let moduleData: CourseContent | null = null;
      if (userId) {
        moduleData = await moduleService.getModuleDetail(courseId, userId);
      }

      setDetail(d);
      setContent(moduleData ?? null)
    } catch (e) {
      console.error('[CourseOutline] load error', e);
      setError('Failed to load course outline');
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Build a quick lookup for section completion by sectionId
  const sectionById = useMemo(() => {
    const map = new Map<string, CourseContent['sections'][number]>();
    if (content?.sections?.length) {
      for (const s of content.sections) map.set(String(s.id), s);
    }
    return map;
  }, [content]);

  // Progress based on sections / modules, matching CourseDetailScreen’s approach
  const progressPct = useMemo(() => {
    if (!detail?.modules?.length || !content?.sections?.length) return 0;
    const completed = content.sections.filter((s) => s.module_is_completed).length;
    const total = detail.modules.length || 1;
    return Math.round((completed / total) * 100);
  }, [detail, content]);

  // Choose a sensible start module:
  // 1) startAt (from enroll)
  // 2) first incomplete based on section completion
  // 3) first module
  const startModule: CourseModule | null = useMemo(() => {
    if (!detail?.modules?.length) return null;

    if (startAt) {
      const byId = detail.modules.find((m) => String(m.id) === String(startAt));
      if (byId) return byId;
    }

    const firstIncomplete = detail.modules.find((m) => {
      const sec = sectionById.get(String(m.id));
      return !sec?.module_is_completed;
    });

    return firstIncomplete ?? detail.modules[0] ?? null;
  }, [detail, startAt, sectionById]);

  const handleStartOrContinue = useCallback(() => {
    if (!startModule) {
      Alert.alert('No content', 'This course has no modules yet.');
      return;
    }
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to continue the course.');
      return;
    }
    navigation.navigate('ModuleDetail', {
      courseId,
      sectionId: String(startModule.id),
      userId,
    });
  }, [startModule, navigation, courseId, userId]);

  const handleOpenModule = useCallback(
    (module: CourseModule) => {
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to open this module.');
        return;
      }
      navigation.navigate('ModuleDetail', {
        courseId,
        sectionId: String(module.id),
        userId,
      });
    },
    [navigation, courseId, userId]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.purple400} />
        <Text style={styles.loadingText}>Loading outline…</Text>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Course not found'}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {detail.title}
        </Text>
      </View>

      <FlatList
        data={detail.modules}
        keyExtractor={(m) => String(m.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.purple400}
          />
        }
        ListHeaderComponent={
          <View style={styles.topCard}>
            <Text style={styles.courseTitle}>{detail.title}</Text>
            <Text style={styles.instructor}>by {detail.instructor.name}</Text>

            {/* Progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>

            {/* Start / Continue */}
            <Pressable style={styles.primaryCta} onPress={handleStartOrContinue}>
              <Ionicons
                name={progressPct > 0 ? 'play-circle' : 'rocket-outline'}
                size={20}
                color={Colors.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryCtaText}>
                {progressPct > 0 ? 'Continue' : 'Start'}
                {startModule ? ` • ${startModule.title}` : ''}
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const sec = sectionById.get(String(item.id));
          const done = !!sec?.module_is_completed;

          return (
            <Pressable style={styles.moduleItem} onPress={() => handleOpenModule(item)}>
              <View style={styles.moduleLeft}>
                <View style={styles.moduleIcon}>
                  <Ionicons name="book-outline" size={18} color={Colors.purple400} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleTitle} numberOfLines={1}>
                    {index + 1}. {item.title}
                  </Text>
                  {!!item.description && (
                    <Text style={styles.moduleDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
              {done ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        ListFooterComponent={<View style={{ height: 8 }} />}
      />
    </SafeAreaView>
  );
};

export default CourseOutlineScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  errorText: {
    color: Colors.red,
    fontSize: TextStyles.body.fontSize,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: TextStyles.h3.fontSize,
    fontWeight: '700',
  },

  topCard: {
    backgroundColor: Colors.gray600,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  courseTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  instructor: {
    color: Colors.textSecondary,
    fontSize: TextStyles.caption.fontSize,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: TextStyles.caption.fontSize,
  },
  progressPct: {
    color: Colors.textPrimary,
    fontSize: TextStyles.caption.fontSize,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.purple400,
  },

  primaryCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.purple400,
    borderRadius: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryCtaText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: TextStyles.body.fontSize,
  },

  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray600,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  moduleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.purple400 + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  moduleTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: TextStyles.body.fontSize,
  },
  moduleDesc: {
    color: Colors.textSecondary,
    fontSize: TextStyles.caption.fontSize,
    marginTop: 2,
  },
});
