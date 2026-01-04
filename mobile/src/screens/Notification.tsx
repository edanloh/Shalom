import { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Colors, Spacing, TextStyles } from "../constants";
import Screen from "../components/common/Screen";

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
      "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    courseTitle: 'Machine Learning Basics',
    subtitle: 'Deadline approaching for your assignment',
    thumbnail:
      "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=200&q=60",
    createdAt: new Date().toISOString(),
  },

  // Yesterday
  {
    id: 'y1',
    courseTitle: 'Data Science Fundamentals',
    subtitle: 'New content added to your course',
    thumbnail:
      "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'y2',
    courseTitle: 'Machine Learning Basics',
    subtitle: 'Deadline approaching for your assignment',
    thumbnail:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=200&q=60",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  // Older
  {
    id: 'o1',
    courseTitle: 'Data Science Fundamentals',
    subtitle: 'New content added to your course',
    thumbnail:
      "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "o2",
    courseTitle: "Machine Learning Basics",
    subtitle: "Deadline approaching for your assignment",
    thumbnail:
      "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=200&q=60",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "o3",
    courseTitle: "Introduction to Python",
    subtitle: "Your course has been updated",
    thumbnail:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=200&q=60",
    createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      // TODO: call your real fetch here, e.g. await reloadNotifications();
      await new Promise((r) => setTimeout(r, 800)); // demo delay
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <Screen
      title="Notifications"
      customEdges={["top"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRightIcon="settings-outline"
      onHeaderRightPress={() => navigation.navigate("Settings")}
    >
      {sections.map((section, sectionIndex) => (
        <View key={section.title} style={{ marginBottom: Spacing.lg }}>
          {/* Section Header */}
          <Text style={TextStyles.h5}>{section.title}</Text>

          {/* Section Items */}
          {section.data.map((item, itemIndex) => (
            <View key={item.id}>
              <TouchableOpacity activeOpacity={0.8} style={styles.row}>
                <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={TextStyles.body} numberOfLines={1}>
                    {item.courseTitle}
                  </Text>
                  <Text style={TextStyles.captionSmall}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
              {/* Item Separator */}
              {itemIndex < section.data.length - 1 && (
                <View style={{ height: Spacing.md }} />
              )}
            </View>
          ))}
        </View>
      ))}      
      <View style={{ height: 120 }} />
    </Screen>
  );
}

const THUMB = 56;

const styles = StyleSheet.create({
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    marginRight: Spacing.md,
  },
});
