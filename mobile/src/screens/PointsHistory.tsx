import { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  RefreshControl,
} from "react-native";
import { Colors, Spacing, TextStyles } from "../constants";
import Screen from "../components/common/Screen";
import creditService from "../services/creditService";
import { CreditEvent } from "../types";
import { useUser } from "../contexts/UserContext";
import { Ionicons } from "@expo/vector-icons";

type AppPointHistory = {
  id: string;
  pointsTitle: string;
  subtitle: string;
  createdAt: string; // ISO date
};

const PAGE_SIZE = 20;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const currentWeekFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const UNKNOWN_DATE_LABEL = "Unknown date";

const startOfWeek = (d: Date) => {
  const day = startOfDay(d);
  const dayOfWeek = day.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  day.setDate(day.getDate() - daysSinceMonday);
  return day;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const parseValidDate = (value?: string | null) => {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const getPointHistorySectionTitle = (d: Date, now = new Date()) => {
  if (isSameDay(d, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";

  const currentWeekStart = startOfWeek(now);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  if (d >= currentWeekStart && d < nextWeekStart) {
    return currentWeekFmt.format(d);
  }

  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  if (d >= lastWeekStart && d < currentWeekStart) return "Last week";

  if (isSameMonth(d, now)) return "This month";

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (isSameMonth(d, lastMonth)) return "Last month";

  return monthFmt.format(startOfMonth(d));
};

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

const formatTime = (iso: string) => {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return timeFmt.format(dt);
};

export default function PointsHistoryScreen({ navigation }: any) {
  const { user } = useUser();
  const dbUserId = user?.uuid;
  const [history, setHistory] = useState<AppPointHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const sections = useMemo(() => {
    const grouped: Record<string, AppPointHistory[]> = {};
    const sectionTimes: Record<string, number> = {};
    const ordered = [...history].sort((a, b) => {
      const bTime = parseValidDate(b.createdAt)?.getTime() ?? 0;
      const aTime = parseValidDate(a.createdAt)?.getTime() ?? 0;
      return bTime - aTime;
    });

    for (const n of ordered) {
      const dt = parseValidDate(n.createdAt);
      if (!dt) {
        if (!grouped[UNKNOWN_DATE_LABEL]) grouped[UNKNOWN_DATE_LABEL] = [];
        grouped[UNKNOWN_DATE_LABEL].push(n);
        continue;
      }

      const key = getPointHistorySectionTitle(dt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(n);
      sectionTimes[key] = Math.max(sectionTimes[key] ?? 0, dt.getTime());
    }

    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === UNKNOWN_DATE_LABEL) return 1;
        if (b === UNKNOWN_DATE_LABEL) return -1;
        return (sectionTimes[b] ?? 0) - (sectionTimes[a] ?? 0);
      })
      .map((title) => ({ title, data: grouped[title] }));
  }, [history]);

  const [refreshing, setRefreshing] = useState(false);

  const mapEvents = useCallback((events: CreditEvent[]) => {
    return events.map((e) => ({
      id: e.id,
      pointsTitle: e.points >= 0 ? `+${e.points}` : `${e.points}`,
      subtitle: e.title,
      createdAt: e.timestamp,
    }));
  }, []);

  const loadHistory = useCallback(async () => {
    if (!dbUserId) {
      setHistory([]);
      setNextOffset(0);
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const events: CreditEvent[] = await creditService.getCreditHistory(dbUserId, {
        limit: PAGE_SIZE,
        offset: 0,
      });
      const mapped = mapEvents(events);
      setHistory(mapped);
      setNextOffset(mapped.length);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.warn("Failed to load credit history", err);
      setHistory([]);
      setNextOffset(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [mapEvents, dbUserId]);

  const loadMoreHistory = useCallback(async () => {
    if (!dbUserId || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const startOffset = nextOffset;
      const events: CreditEvent[] = await creditService.getCreditHistory(dbUserId, {
        limit: PAGE_SIZE,
        offset: startOffset,
      });
      const mapped = mapEvents(events);
      setHistory((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        return [...prev, ...mapped.filter((item) => !existing.has(item.id))];
      });
      setNextOffset(startOffset + mapped.length);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.warn("Failed to load more credit history", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, mapEvents, nextOffset, dbUserId]);

  useEffect(() => {
    loadHistory();
    const unsub = creditService.subscribeToCreditUpdates(loadHistory);
    return () => {
      if (unsub) unsub();
    };
  }, [loadHistory, dbUserId]);

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
      headerRightIcon="storefront-outline"
      onHeaderLeftPress={() => navigation.goBack()}
      onHeaderRightPress={() => navigation.navigate("CreditsShop")}
      stickyHeader
      useScrollView={false}
      disableChildrenWrapper
    >
      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          String(
            item.id ??
              `points-${index}-${item.pointsTitle ?? item.subtitle ?? "row"}`
          )
        }
        renderItem={({ item, index, section }) => (
          <View>
            <TouchableOpacity activeOpacity={0.8} style={styles.row}>
              <View style={styles.iconBadge}>
                <Ionicons name="trending-up" size={22} color={Colors.green} />
              </View>
              <View style={styles.textBlock}>
                <Text style={TextStyles.body} numberOfLines={1}>
                  {item.pointsTitle}
                </Text>
                <Text style={TextStyles.captionSmall} numberOfLines={1} ellipsizeMode="tail">
                  {item.subtitle}
                </Text>
              </View>
              <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
            </TouchableOpacity>
            {index < section.data.length - 1 ? (
              <View style={{ height: Spacing.md }} />
            ) : null}
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={TextStyles.h5}>{section.title}</Text>
          </View>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
            colors={[Colors.secondary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={48} color={Colors.textMuted} />
              <Text style={[TextStyles.h4, { marginTop: Spacing.md }]}>
                No points history yet
              </Text>
              <Text style={[TextStyles.caption, { marginTop: Spacing.xs, textAlign: "center" }]}>
                Complete lessons and quizzes to earn points.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              {loadingMore ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : null}
            </View>
          ) : (
            <View style={styles.footer} />
          )
        }
        onEndReached={loadMoreHistory}
        onEndReachedThreshold={0.6}
        stickySectionHeadersEnabled={false}
      />
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
  iconBadge: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    marginRight: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundGray,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  timeText: {
    ...TextStyles.captionSmall,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  loadingState: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  list: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
