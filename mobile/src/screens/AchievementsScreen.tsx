import { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Colors, Spacing, TextStyles } from "../constants";
import Screen from "../components/common/Screen";

type Achievements = {
  id: string;
  pointsTitle: string;
  subtitle: string;
  thumbnail: string;
  createdAt: string; // ISO date
};

const MOCK_POINTS_HISTORY: Achievements[] = [
  // Today
  {
    id: 't1',
    pointsTitle: '+100 points',
    subtitle: 'Quiz completed: Data Science Fundamentals',
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1681487870238-4a2dfddc6bcb?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    pointsTitle: '+500 points',
    subtitle: 'Course completed: Data Science Fundamentals',
    thumbnail:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date().toISOString(),
  },

  // Yesterday
  {
    id: 'y1',
    pointsTitle: '+100 points',
    subtitle: 'Quiz completed: Data Science Fundamentals',
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1681487870238-4a2dfddc6bcb?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'y2',
   pointsTitle: '+500 points',
    subtitle: 'Course completed: Data Science Fundamentals',
    thumbnail:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  // Older
  {
    id: 'o1',
    pointsTitle: '+100 points',
    subtitle: 'Quiz completed: Data Science Fundamentals',
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1681487870238-4a2dfddc6bcb?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "o2",
    pointsTitle: '+500 points',
    subtitle: 'Course completed: Data Science Fundamentals',
    thumbnail:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1473&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "o3",
    pointsTitle: '+100 points',
    subtitle: 'Quiz completed: Data Science Fundamentals',
    thumbnail:
      "https://plus.unsplash.com/premium_photo-1681487870238-4a2dfddc6bcb?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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

export default function AchievementsScreen({ navigation }: any) {
  const sections = useMemo(() => {
    const today: Achievements[] = [];
    const yesterday: Achievements[] = [];
    const byDate: Record<string, Achievements[]> = {};

    for (const n of MOCK_POINTS_HISTORY) {
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

    const result: Array<{ title: string; data: Achievements[] }> = [];
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
      // TODO: call your real fetch here, e.g. await reloadPointsHistory();
      await new Promise((r) => setTimeout(r, 800)); // demo delay
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <Screen
      title="Points History"
      customEdges={["top", "left", "right"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
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
                    {item.pointsTitle}
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
