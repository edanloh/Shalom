import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useMyCourses } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';
import { Colors, Spacing, TextStyles, BorderRadius, Shadows } from '../constants';
import type { Course } from '../types';
import type { MainStackParamList } from '../types';
import { useCourses } from '../contexts/CourseContext';
import { ActionButton, Screen } from '@/components';

const ProgressBar = ({ percent }: { percent: number }) => {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.pbTrack}>
      <View style={[styles.pbFill, { width: `${p}%` }]} />
    </View>
  );
};

const MyCourses: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();
  const { courses, loading, error, refreshing, refresh, retry } = useMyCourses();
  const { wishlist = [], toggleWishlist } = useCourses();

  const wishIds = useMemo(() => new Set(wishlist.map(c => c.id)), [wishlist]);
  const isWishlisted = (c: Course) => wishIds.has(c.id);


  // Debug logging for user state
  useEffect(() => {
    console.log('MyCourses - Current user from AuthContext:', user);
    if (user) {
      console.log('MyCourses - User ID for enrollment fetch:', user.id);
    }
  }, [user]);

  // Filter courses for incomplete ones only (progress < 100% and > 0%)
  const { continueWatching, inProgress, notStarted } = useMemo(() => {
    const allCourses = courses || [];
    
    // Continue Watching: courses with progress > 0% but < 100%
    const cw = allCourses.filter(c => {
      const progress = c.progress?.percentage ?? 0;
      return progress > 0 && progress < 100;
    });
    
    // In Progress: same as continue watching (showing progress)
    const ip = cw;
    
    // Not Started: courses with 0% progress
    const ns = allCourses.filter(c => (c.progress?.percentage ?? 0) === 0);
    
    // console.log('MyCourses - Filtered courses:', { 
    //   total: allCourses.length, 
    //   continueWatching: cw.length, 
    //   inProgress: ip.length, 
    //   notStarted: ns.length 
    // });
    
    return { continueWatching: cw, inProgress: ip, notStarted: ns };
  }, [courses]);

  const getModuleLabel = (course: Course): string => {
    const completed = course?.progress?.completed ?? 0;
    const total     = course?.progress?.total ?? 1;
    const pct       = course?.progress?.percentage ?? 0;

    // figure out which module index the user is on
    const isDone = pct >= 100 || completed >= total;
    const index  = isDone 
        ? Math.max(1, Math.min(completed, total))
        : Math.max(1, Math.min(completed + 1, total));

    const raw = typeof course.progress?.currentModule === 'string'
        ? course.progress!.currentModule!.trim()
        : '';

    if (!raw) return `Module ${index}`;           // no title provided

    // If the string already looks like "Module 8: Something", just use it.
    if (/^module\s*\d+/i.test(raw)) return raw;

    // Otherwise assume it's just a title and format it.
    return `Module ${index}: ${raw}`;
  };

  // Handle user not authenticated
  if (!user) {
    return (
      <Screen
        title="My Courses"
        navigation={navigation}
        headerLeftIcon="chevron-back"
      >
        <View style={styles.centerContainer}>
          <Text style={TextStyles.body}>Please log in to view your courses</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="My Courses"
      navigation={navigation}
      headerLeftIcon="chevron-back"
    >
      <View>
        {/* Continue Watching Section */}
        <Text style={[ TextStyles.h5, { marginVertical: Spacing.md, marginBottom: Spacing.base }]}>Continue Watching</Text>
        
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.purple400} />
            <Text style={styles.loadingMessage}>Loading your courses...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorMessage}>Error: {error}</Text>
            <ActionButton
              text="Retry"
              onPress={retry}
            />
          </View>
        ) : continueWatching.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={TextStyles.body}>No courses in progress</Text>
            <Text style={TextStyles.caption}>Start a course to see it here!</Text>
          </View>
        ) : (
          <FlatList
            data={continueWatching}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
            extraData={wishlist}
            renderItem={({ item }) => {
              const moduleLabel = getModuleLabel(item);
              return (
                <TouchableOpacity 
                  style={styles.cwCard}
                  onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
                >
                  {/* rounded rect ONLY for the thumbnail */}
                  <View style={styles.cwThumbWrapper}>
                    <ImageWithFallback 
                      source={{ uri: item.image }} 
                      fallback={Images.coursePlaceholder}
                      style={styles.cwThumb} 
                    /> 

                    {/* Progress indicator overlay */}
                    <View style={styles.progressOverlay}>
                      <Text style={styles.progressText}>{Math.round(item.progress?.percentage || 0)}%</Text>
                    </View>
                  </View>

                  {/* text sits outside, below */}
                  <Text style={TextStyles.bodyMedium} numberOfLines={2}>{item.title}</Text>
                  <Text style={TextStyles.caption} numberOfLines={1}>{moduleLabel}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* In Progress Section */}
        <Text style={[ TextStyles.h5, { marginTop: Spacing.xl, marginBottom: Spacing.base }]}>In Progress</Text>
        
        {(loading || error) ? (
        // No horizontal padding for the loading/error text
        <Text style={[styles.message, { paddingHorizontal: 0, marginHorizontal: Spacing.lg }]}>
            {loading ? 'Loading…' : `Error: ${error}`}
        </Text>
        ) : (
        // Apply horizontal padding only to the content block
        <View>
            {inProgress.map((item) => {
            const pct = item.progress?.percentage ?? 0;
            const moduleLabel = getModuleLabel(item);
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
                style={styles.ipCard}
              >
                {/* Left: text */}
                <View style={styles.ipLeft}>
                  <Text style={styles.ipTitle} numberOfLines={2}>{item.title}</Text>

                  {/* meta row like Wishlist */}
                  <View style={styles.ipMetaRow}>
                    <Ionicons name="star" size={12} color="#FACC15" />
                    <Text style={styles.ipMetaText}>{(item.rating as any)?.toFixed?.(1) ?? item.rating}</Text>
                    <Text style={styles.ipMetaDot}>•</Text>
                    <Text style={styles.ipMetaText}>{item.modules ?? 12} modules</Text>
                  </View>

                  <View style={styles.ipPercentRow}>
                    <Text style={styles.ipMetaText}>{pct}% complete</Text>
                  </View>

                  <ProgressBar percent={pct} />
                </View>

                {/* Right: fixed image block + overlays */}
                <View style={styles.ipRight}>
                  <ImageWithFallback
                    source={{ uri: item.image }}
                    fallback={Images.coursePlaceholder}
                    style={styles.ipImage}
                  />
                  <View style={styles.badgeRow}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{item.level}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); toggleWishlist?.(item); }}
                      hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                      style={styles.heartBtn}
                      accessibilityRole="button"
                      accessibilityLabel={wishIds.has(item.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Ionicons
                        name={wishIds.has(item.id) ? 'heart' : 'heart-outline'}
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
};

const CARD_RADIUS = BorderRadius.lg;

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
    width: '120%',
    gap: Spacing.sm
  },
  cwThumbWrapper: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: Colors.loadingBackdrop,
    ...Shadows.medium,
  },
  // Image fills wrapper; NO borderRadius here
  cwThumb: {
    width: '100%',
    height: 150,
    paddingBottom: Spacing.sm
  },
  badgeRow: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 11,
    fontWeight: '700',
  },
  heartBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 6,
  },

  // In Progress (vertical cards)
  ipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardDark,
    borderRadius: CARD_RADIUS,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    minHeight: 100,
  },
  ipLeft: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    paddingRight: Spacing.md,
    flexShrink: 1,
  },
  ipRight: {
    width: 150,
    alignSelf: 'stretch',
    backgroundColor: '#E7F0EC',
    position: 'relative',
    overflow: 'hidden',
  },
  ipImage: {
    flex: 1,
    width: undefined,
    height: undefined,
    resizeMode: 'cover',
  },
  ipTitle: {
    ...TextStyles.bodyMedium,
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  ipMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
    marginBottom: 6,
  },
  ipMetaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  ipMetaDot: { 
    color: Colors.textSecondary, 
    marginHorizontal: 4 
  },
  ipSubtitle: {
    ...TextStyles.caption,
    marginBottom: 4,
  },
  ipPercentRow: {
    alignItems: 'flex-end',
    marginVertical: 6,
  },

  // progress bar
  pbTrack: {
    height: 4,
    backgroundColor: Colors.progressTrack,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
  },
  pbFill: {
    height: '100%',
    backgroundColor: Colors.progressFill,
  },

  // New styles for better UX
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  loadingMessage: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.red,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  progressOverlay: {
    position: 'absolute',
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
    fontWeight: '600',
  },
});

export default MyCourses;