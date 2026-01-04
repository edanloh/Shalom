import { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Spacing, TextStyles, Colors } from "../constants";
import Screen from "../components/common/Screen";
import { Ionicons } from "@expo/vector-icons";
import CustomTextInput from "@/components/CustomTextInput";
import CustomModal from "../components/common/CustomModal";

type Achievement = {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  createdAt: string; // ISO date
  points?: number;
};

const MOCK_ACHIEVEMENTS: Achievement[] = [
  // Today
  {
    id: "t1",
    icon: "medal-outline",
    label: "Digital Literacy",
    subtitle: "Completed digital literacy fundamentals course",
    createdAt: new Date().toISOString(),
    points: 50,
  },
  {
    id: "t2",
    icon: "trophy-outline",
    label: "Perfect Scorer",
    subtitle: "Scored 100% on Data Science quiz",
    createdAt: new Date().toISOString(),
    points: 75,
  },

  // Yesterday
  {
    id: "y1",
    icon: "thumbs-up-outline",
    label: "Review Master",
    subtitle: "Left 10 helpful course reviews",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    points: 30,
  },
  {
    id: "y2",
    icon: "school-outline",
    label: "Dedicated Learner",
    subtitle: "Completed 5 courses this month",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    points: 100,
  },

  // Older
  {
    id: "o1",
    icon: "checkmark-done-circle-outline",
    label: "Knowledge Seeker",
    subtitle: "Completed all quizzes in a course",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    points: 40,
  },
  {
    id: "o2",
    icon: "play-circle-outline",
    label: "Learning Champion",
    subtitle: "Watched 20 hours of course videos",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    points: 20,
  },
  {
    id: "o3",
    icon: "medal-outline",
    label: "Digital Literacy",
    subtitle: "Mastered digital literacy basics",
    createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    points: 50,
  },
];

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

export default function AchievementsScreen({ navigation }: any) {
  const [query, setQuery] = useState("");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);

  const sections = useMemo(() => {
    // Filter achievements based on search query
    const filteredAchievements = MOCK_ACHIEVEMENTS.filter((achievement) => {
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
  }, [query]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      // TODO: call your real fetch here, e.g. await reloadAchievements();
      await new Promise((r) => setTimeout(r, 800)); // demo delay
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <Screen
      title="Achievements"
      customEdges={["top", "left", "right", "bottom"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
    >
      <CustomTextInput
        placeholder="Search for achievements..."
        value={query}
        onChangeText={setQuery}
        autoCapitalize={"none"}
        leftIconName="search"
        returnKeyType="search"
      />

      {sections.map((section, sectionIndex) => (
        <View key={section.title} style={{ marginBottom: Spacing.lg }}>
          {/* Section Header */}
          <Text style={TextStyles.h5}>{section.title}</Text>

          {/* Section Items */}
          {section.data.map((item, itemIndex) => (
            <View key={item.id}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.row}
                onPress={() => setSelectedAchievement(item)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon as any} size={28} color="#FACC15" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={TextStyles.body} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={TextStyles.captionSmall}>{item.subtitle}</Text>
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

      {/* Achievement Detail Modal */}
      <CustomModal
        visible={selectedAchievement !== null}
        onClose={() => setSelectedAchievement(null)}
      >
        {/* Achievement Icon */}
        <View style={styles.modalIconContainer}>
          <View style={styles.modalIconBadge}>
            <Ionicons
              name={selectedAchievement?.icon as any}
              size={64}
              color={Colors.yellow}
            />
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
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 12,
    backgroundColor: "#3A3A45",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
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
  pointsBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
});
