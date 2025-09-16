import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useMyCourses } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';
import { Colors, Spacing, TextStyles } from '../constants';
import type { Course } from '../types';
import type { MainStackParamList } from '../types';

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
    
    console.log('MyCourses - Filtered courses:', { 
      total: allCourses.length, 
      continueWatching: cw.length, 
      inProgress: ip.length, 
      notStarted: ns.length 
    });
    
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
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle="light-content" translucent={false} backgroundColor={Colors.primary} />
        <View style={styles.centerContainer}>
          <Text style={styles.message}>Please log in to view your courses</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','left','right']}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Courses</Text>
        {/* spacer to balance flex */}
        <View style={{ width: 26 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.textPrimary}
            colors={[Colors.purple400]}
          />
        }
      >
        {/* Continue Watching Section */}
        <Text style={styles.sectionTitle}>Continue Watching</Text>
        
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.purple400} />
            <Text style={styles.loadingMessage}>Loading your courses...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorMessage}>Error: {error}</Text>
            <TouchableOpacity onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : continueWatching.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyMessage}>No courses in progress</Text>
            <Text style={styles.emptySubMessage}>Start a course to see it here!</Text>
          </View>
        ) : (
          <FlatList
            data={continueWatching}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: Spacing.md }} />}
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
                  <Text style={styles.cwTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cwSubtitle} numberOfLines={1}>{moduleLabel}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* In Progress Section */}
            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>In Progress</Text>
            
            {(loading || error) ? (
            // No horizontal padding for the loading/error text
            <Text style={[styles.message, { paddingHorizontal: 0, marginHorizontal: Spacing.lg }]}>
                {loading ? 'Loading…' : `Error: ${error}`}
            </Text>
            ) : (
            // Apply horizontal padding only to the content block
            <View style={{ paddingHorizontal: Spacing.lg }}>
                {inProgress.map((item) => {
                const pct = item.progress?.percentage ?? 0;
                const moduleLabel = getModuleLabel(item);
                return (
                    <View key={item.id} style={styles.ipCard}>
                    <View style={styles.ipLeft}>
                        <Text style={styles.ipTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.ipSubtitle} numberOfLines={1}>{moduleLabel}</Text>
                        <Text style={styles.ipSubtitle}>{pct}% completed</Text>
                        <ProgressBar percent={pct} />
                    </View>
                    <View style={styles.ipRight}>
                        <ImageWithFallback 
                          source={{ uri: item.image }} 
                          fallback={Images.coursePlaceholder}
                          style={styles.ipRightImage} 
                        />
                    </View>
                    </View>
                );
                })}
            </View>
            )}

            <View style={{ height: Spacing.xl * 1.5 }} />
            </ScrollView>
    </SafeAreaView>
    
  );
};

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary, // your dark background
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },

  // Section title
  sectionTitle: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontSize: 20,
    fontWeight: 'bold',
  },

  message: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    fontSize: 14,
  },

  // Continue Watching (horizontal)
  cwCard: {
    width: 300,
  },
  cwThumbWrapper: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#1f2937', // subtle backdrop for loading
    // optional soft shadow (iOS only; Android uses elevation)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  // Image fills wrapper; NO borderRadius here
  cwThumb: {
    width: '100%',
    height: 150,
  },
  cwTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  cwSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    fontSize: 13,
    marginTop: 2,
  },

  // In Progress (vertical cards)
  ipCard: {
    flexDirection: 'row',
    backgroundColor: '#0E0F15',
    borderRadius: CARD_RADIUS,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  ipLeft: {
    flex: 1,
    padding: Spacing.md,
  },
  ipRight: {
    width: 140,
    backgroundColor: '#E7F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ipRightImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ipTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  ipSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontSize: 13,
  },

  // progress bar
  pbTrack: {
    height: 4,
    backgroundColor: '#D1D5DB', // light grey remainder
    borderRadius: 8,
    overflow: 'hidden',
  },
  pbFill: {
    height: '100%',
    backgroundColor: '#4F46E5', // purple fill
  },

  // New styles for better UX
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    minHeight: 200,
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
  retryButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    ...TextStyles.body,
    color: Colors.white,
    fontWeight: '600',
  },
  emptyMessage: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubMessage: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MyCourses;
