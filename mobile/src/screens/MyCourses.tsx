import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMyCourses } from '../hooks';
import { Colors, Spacing, TextStyles } from '../constants';
import type { Course } from '../types';

const ProgressBar = ({ percent }: { percent: number }) => {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.pbTrack}>
      <View style={[styles.pbFill, { width: `${p}%` }]} />
    </View>
  );
};

const MyCourses: React.FC = () => {
  const navigation = useNavigation();
  const { courses, loading, error } = useMyCourses();

  // Buckets for the two sections
  const { continueWatching, inProgress } = useMemo(() => {
    const cw = (courses || []).filter(c => (c.progress?.percentage ?? 0) > 0);
    const ip = cw.filter(c => (c.progress?.percentage ?? 0) < 100);
    return { continueWatching: cw, inProgress: ip };
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

            <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
            {/* Continue Watching */}
            <Text style={styles.sectionTitle}>Continue Watching</Text>
            {loading ? (
                <Text style={styles.message}>Loading…</Text>
            ) : error ? (
                <Text style={styles.message}>Error: {error}</Text>
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
                    <View style={styles.cwCard}>
                        {/* rounded rect ONLY for the thumbnail */}
                        <View style={styles.cwThumbWrapper}>
                            <Image source={{ uri: item.image }} style={styles.cwThumb} />
                        </View>

                        {/* text sits outside, below */}
                        <Text style={styles.cwTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.cwSubtitle} numberOfLines={1}>{moduleLabel}</Text>
                    </View>
                );
                }}
                />
            )}

            {/* In Progress */}
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
                        <Ionicons name="trending-up-outline" size={42} color="#6B7280" />
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
});

export default MyCourses;
