import { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  RefreshControl,
  Image,
} from "react-native";
import { Spacing, TextStyles, Colors } from "../constants";
import Screen from "../components/common/Screen";
import { Ionicons } from "@expo/vector-icons";
import CustomTextInput from "@/components/CustomTextInput";
import CustomModal from "../components/common/CustomModal";
import creditService from "../services/creditService";
import { AchievementItem } from "../types";
import { useUser } from "../contexts/UserContext";

type Achievement = {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  sourceLabel?: string;
  createdAt: string; // ISO date
  points?: number;
  earned?: boolean;
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isSameDay = (a: Date, b: Date) =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};

const fmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const isIconUrl = (value?: string) =>
  !!value && (value.startsWith("http://") || value.startsWith("https://"));

const PAGE_SIZE = 20;

export default function AchievementsScreen({ navigation }: any) {
  const { user } = useUser();
  const dbUserId = user?.uuid;
  const [query, setQuery] = useState("");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);

  const mapAchievements = useCallback((items: AchievementItem[] = []) => {
    const iconFor = (a: any) => {
      const byType: Record<string, string> = {
        badge: "trophy-outline",
        streak: "flame",
        certificate: "ribbon-outline",
        level: "ribbon-outline",
      };
      if (isIconUrl(a.icon)) return a.icon;
      return byType[a.type] || byType[a.icon] || a.icon || "trophy-outline";
    };

    return items
      .filter((a: any) => a.earned !== false)
      .map((a: AchievementItem) => {
        const sourceCourseTitle = (a as any).sourceCourseTitle || (a as any).source_course_title;
        const sourceInstructorName =
          (a as any).sourceInstructorName || (a as any).source_instructor_name;
        const scopeType = ((a as any).scopeType || (a as any).scope_type || "global") as string;
        const sourceLabel = sourceCourseTitle
          ? `From ${sourceCourseTitle}`
          : sourceInstructorName
            ? `Instructor: ${sourceInstructorName}`
            : scopeType === "global"
              ? "Platform achievement"
              : undefined;

        return {
          id: a.id,
          icon: iconFor(a),
          label: a.label || (a as any).name || "Achievement",
          subtitle: (a as any).description || a.label || "",
          sourceLabel,
          createdAt:
            (a as any).earnedAt ||
            (a as any).earned_at ||
            (a as any).createdAt ||
            new Date().toISOString(),
          points: (a as any).points ?? undefined,
          earned: (a as any).earned ?? true,
        };
      });
  }, []);

  const load = useCallback(async () => {
    if (!dbUserId) {
      setAchievements([]);
      setNextOffset(0);
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const remote = await creditService
        .getAchievements(dbUserId, {
        limit: PAGE_SIZE,
        offset: 0,
      })
        .catch(() => []);
      const normalized = mapAchievements(remote);
      setAchievements(normalized);
      setNextOffset(normalized.length);
      setHasMore(normalized.length === PAGE_SIZE);
    } catch (err) {
      console.warn("Achievements: failed to load", err);
      setAchievements([]);
      setNextOffset(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [mapAchievements, dbUserId]);

  useEffect(() => {
    load();
  }, [load, dbUserId]);

  const sections = useMemo(() => {
    // Filter achievements based on search query
    const filteredAchievements = achievements.filter((achievement) => {
      if (!query.trim()) return true;
      const searchTerm = query.toLowerCase();
      return (
        achievement.label.toLowerCase().includes(searchTerm) ||
        achievement.subtitle.toLowerCase().includes(searchTerm)
      );
    });

    const today: Achievement[] = [];
    const yesterday: Achievement[] = [];
    const byDate: Record<string, Achievement[]> = {};

    for (const n of filteredAchievements) {
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

    const result: Array<{ title: string; data: Achievement[] }> = [];
    if (today.length) result.push({ title: "Today", data: today });
    if (yesterday.length) result.push({ title: "Yesterday", data: yesterday });

    // Add older groups sorted by most-recent first
    const olderDates = Object.keys(byDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    for (const key of olderDates) {
      result.push({ title: key, data: byDate[key] });
    }

    return result;
  }, [query, achievements]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!dbUserId || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const startOffset = nextOffset;
      const remote = await creditService
        .getAchievements(dbUserId, {
        limit: PAGE_SIZE,
        offset: startOffset,
      })
        .catch(() => []);
      const normalized = mapAchievements(remote);
      setAchievements((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        return [...prev, ...normalized.filter((item) => !existing.has(item.id))];
      });
      setNextOffset(startOffset + normalized.length);
      setHasMore(normalized.length === PAGE_SIZE);
    } catch (err) {
      console.warn("Achievements: failed to load more", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, mapAchievements, nextOffset, dbUserId]);

  return (
    <Screen
      title="Achievements"
      customEdges={["top", "left", "right", "bottom"]}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      stickyHeader
      useScrollView={false}
      disableChildrenWrapper
    >
      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          String(
            item.id ??
              `achievement-${index}-${item.label ?? item.subtitle ?? "row"}`
          )
        }
        renderItem={({ item, index, section }) => (
          <View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.row}
              onPress={() => setSelectedAchievement(item)}
            >
              <View style={styles.iconContainer}>
                {isIconUrl(item.icon) ? (
                  <Image source={{ uri: item.icon }} style={styles.iconImage} resizeMode="cover" />
                ) : (
                  <Ionicons name={item.icon as any} size={28} color="#FACC15" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={TextStyles.body} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={TextStyles.captionSmall}>{item.subtitle}</Text>
                {item.sourceLabel ? (
                  <Text style={[TextStyles.captionSmall, { color: Colors.textMuted }]}>
                    {item.sourceLabel}
                  </Text>
                ) : null}
              </View>
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
        ListHeaderComponent={
          <CustomTextInput
            placeholder="Search for achievements..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize={"none"}
            leftIconName="search"
            returnKeyType="search"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={Colors.textMuted} />
              <Text style={[TextStyles.h4, { marginTop: Spacing.md }]}>
                No Achievements Yet
              </Text>
              <Text
                style={[
                  TextStyles.caption,
                  { marginTop: Spacing.xs, textAlign: "center" },
                ]}
              >
                Complete courses and hit goals to earn achievements.
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        stickySectionHeadersEnabled={false}
      />

      {/* Achievement Detail Modal */}
      <CustomModal
        visible={selectedAchievement !== null}
        onClose={() => setSelectedAchievement(null)}
      >
        {/* Achievement Icon */}
        <View style={styles.modalIconContainer}>
          <View style={styles.modalIconBadge}>
            {isIconUrl(selectedAchievement?.icon) ? (
              <Image
                source={{ uri: selectedAchievement?.icon }}
                style={styles.modalIconImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name={selectedAchievement?.icon as any}
                size={64}
                color={Colors.yellow}
              />
            )}
          </View>
        </View>

        <Text
          style={[
            TextStyles.h3,
            { textAlign: "center", marginBottom: Spacing.md },
          ]}
        >
          {selectedAchievement?.label}
        </Text>

        <Text
          style={[
            TextStyles.body,
            {
              textAlign: "center",
              marginBottom: Spacing.lg,
              color: Colors.textSecondary,
            },
          ]}
        >
          {selectedAchievement?.subtitle}
        </Text>
        {selectedAchievement?.sourceLabel ? (
          <Text
            style={[
              TextStyles.caption,
              {
                textAlign: "center",
                marginTop: -Spacing.sm,
                marginBottom: Spacing.md,
                color: Colors.textMuted,
              },
            ]}
          >
            {selectedAchievement.sourceLabel}
          </Text>
        ) : null}

        {/* Points Badge */}
        {selectedAchievement?.points && (
          <View
            style={[
              styles.pointsBadge,
              { alignSelf: "center", marginBottom: Spacing.md },
            ]}
          >
            <Ionicons
              name="flame"
              size={20}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={[TextStyles.bodyMedium, { color: "#fff" }]}>
              + {selectedAchievement.points} points
            </Text>
          </View>
        )}

        {/* Earned On */}
        {selectedAchievement?.createdAt && (
          <Text
            style={[
              TextStyles.caption,
              { textAlign: "center", marginTop: Spacing.md },
            ]}
          >
            Earned on: {formatDate(selectedAchievement.createdAt)}
          </Text>
        )}
      </CustomModal>
    </Screen>
  );
}

const ICON_SIZE = 56;

const styles = StyleSheet.create({
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  loadingState: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 12,
    backgroundColor: "#3A3A45",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  iconImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 12,
  },

  // Modal Styles
  modalIconContainer: {
    alignSelf: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  modalIconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#80703e",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  pointsBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
});
