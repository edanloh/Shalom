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

const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};

const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
