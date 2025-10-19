import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Image,
  TouchableOpacity,
  StatusBar,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../constants';

type AppNotification = {
  id: string;
  courseTitle: string;
  subtitle: string;
  thumbnail: string;
  createdAt: string; // ISO date
};

const MOCK_NOTIFICATIONS: AppNotification[] = [
  // Today
  {
    id: 't1',
    courseTitle: 'Data Science Fundamentals',
    subtitle: 'New content added to your course',
    thumbnail:
      'https://images.unsplash.com/photo-1551281044-8b89c2e2baea?w=200&q=60',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    courseTitle: 'Machine Learning Basics',
    subtitle: 'Deadline approaching for your assignment',
    thumbnail:
      'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=200&q=60',
    createdAt: new Date().toISOString(),
  },

  // Yesterday
  {
    id: 'y1',
    courseTitle: 'Data Science Fundamentals',
    subtitle: 'New content added to your course',
    thumbnail:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=200&q=60',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'y2',
    courseTitle: 'Machine Learning Basics',
    subtitle: 'Deadline approaching for your assignment',
    thumbnail:
      'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=200&q=60',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  // Older
  {
    id: 'o1',
    courseTitle: 'Data Science Fundamentals',
    subtitle: 'New content added to your course',
    thumbnail:
      'https://images.unsplash.com/photo-1551281044-8b89c2e2baea?w=200&q=60',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};

const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function NotificationsScreen({ navigation }: any) {
  const sections = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const byDate: Record<string, AppNotification[]> = {};

    for (const n of MOCK_NOTIFICATIONS) {
      const dt = new Date(n.createdAt);

      if (isToday(dt)) {
        today.push(n);
      } else if (isYesterday(dt)) {
        yesterday.push(n);
      } else {
        const key = fmt.format(dt); // e.g., "Sep 2, 2025"
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(n);
      }
    }

    const result: Array<{ title: string; data: AppNotification[] }> = [];
    if (today.length) result.push({ title: 'Today', data: today });
    if (yesterday.length) result.push({ title: 'Yesterday', data: yesterday });

    // Add older groups sorted by most-recent first
    const olderDates = Object.keys(byDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    for (const key of olderDates) {
      result.push({ title: key, data: byDate[key] });
    }

    return result;
  }, []);

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.row}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={1}>
          {item.courseTitle}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.stickyHeader}>
      <Text style={styles.stickyHeaderText}>{title}</Text>
    </View>
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      // TODO: call your real fetch here, e.g. await reloadNotifications();
      await new Promise(r => setTimeout(r, 800)); // demo delay
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Ionicons name="settings-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        SectionSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.white}             // iOS spinner color
            colors={[Colors.purple400]}          // Android spinner colors
            progressViewOffset={8}               // Android offset (optional)
          />
        }
      />
    </SafeAreaView>
  );
}

const THUMB = 56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary, // dark bg
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: TextStyles.h4.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  stickyHeader: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
  },
  stickyHeaderText: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
    fontSize: TextStyles.h4.fontSize,
    fontWeight: 'bold',
  },
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    marginRight: Spacing.md,
  },
  rowText: {
    flex: 1,
  },
  title: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontSize: 13,
  },
});