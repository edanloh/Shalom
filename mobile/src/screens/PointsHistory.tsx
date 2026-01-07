import { useMemo, useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Colors, Spacing, TextStyles } from "../constants";
import Screen from "../components/common/Screen";
import creditService from "../services/creditService";
import { CreditEvent } from "../types";

type AppPointHistory = {
  id: string;
  pointsTitle: string;
  subtitle: string;
  thumbnail: string;
  createdAt: string; // ISO date
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};

const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function PointsHistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<AppPointHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const sections = useMemo(() => {
    const today: AppPointHistory[] = [];
    const yesterday: AppPointHistory[] = [];
    const byDate: Record<string, AppPointHistory[]> = {};

    for (const n of history) {
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

    const result: Array<{ title: string; data: AppPointHistory[] }> = [];
    if (today.length) result.push({ title: 'Today', data: today });
    if (yesterday.length) result.push({ title: 'Yesterday', data: yesterday });

    // Add older groups sorted by most-recent first
    const olderDates = Object.keys(byDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    for (const key of olderDates) {
      result.push({ title: key, data: byDate[key] });
    }

    return result;
  }, [history]);

  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const events: CreditEvent[] = await creditService.getCreditHistory();
      const mapped: AppPointHistory[] = events.map((e) => ({
        id: e.id,
        pointsTitle: `+${e.points}`,
        subtitle: e.title,
        thumbnail: "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=400&h=300&fit=crop",
        createdAt: e.timestamp,
      }));
      setHistory(mapped);
    } catch (err) {
      console.warn("Failed to load credit history", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    const unsub = creditService.subscribeToCreditUpdates(loadHistory);
    return () => {
      if (unsub) unsub();
    };
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory]);

  return (
    <Screen
      title="Points History"
      customEdges={["top", "left", "right", "bottom"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      stickyHeader
    >
      {loading ? (
        <View style={{ paddingVertical: Spacing.xl, alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      ) : null}
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
