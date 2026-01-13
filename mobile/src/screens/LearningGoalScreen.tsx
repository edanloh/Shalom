import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "@/components";
import { Colors, Spacing, TextStyles } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import externalStyles from "@styles/styles";
import creditService from "../services/creditService";
import { LearningGoal } from "../types";
import { useAuth } from "../contexts/AuthContext";

const CARD_BG = "#3A3A45";
const TILE_BG = "#5B38E3";

const GoalCard = ({ goal }: any) => (
  <View style={styles.goalCard}>
    <View
      style={{
        marginBottom: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={styles.iconBadge}>
        <Ionicons name={goal.icon} size={20} color={goal.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
      </View>
    </View>
    <View style={{ marginTop: Spacing.xs }}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
              backgroundColor: goal.color,
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {goal.current} / {goal.target} {goal.unit}
      </Text>
    </View>
  </View>
);

const StatTile = ({ stat }: any) => (
  <View style={styles.statTile}>
    <Ionicons name={stat.icon} size={28} color={stat.color} />
    <Text style={styles.statNumber}>{stat.value}</Text>
    <Text style={styles.statLabel}>{stat.label}</Text>
  </View>
);

export default function LearningGoalScreen({ navigation }: any) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [completedCourses, setCompletedCourses] = useState<number>(0);
  const [studyHours, setStudyHours] = useState<number>(0);

  const mapGoals = (raw: LearningGoal[]): any[] =>
    (raw || []).map((g) => {
      const targetPoints = Number(g.targetPoints ?? 0);
      const targetCourses = Number(g.targetCourses ?? 0);
      const targetHours = Number(g.targetHours ?? 0);
      const currentPoints = Number(g.currentPoints ?? 0);
      const currentCourses = Number(g.currentCourses ?? 0);
      const currentHours = Number(g.currentHours ?? 0);
      const icon = g.label.toLowerCase().includes("time")
        ? "time-outline"
        : g.label.toLowerCase().includes("course")
        ? "school-outline"
        : "trophy-outline";
      const color =
        icon === "time-outline" ? "#60A5FA" : icon === "school-outline" ? "#34D399" : Colors.yellow;
      let metric: "points" | "courses" | "hours" = "hours";
      if (targetPoints > 0 || currentPoints > 0) metric = "points";
      else if (targetCourses > 0 || currentCourses > 0) metric = "courses";
      else if (targetHours > 0 || currentHours > 0) metric = "hours";
      else if (g.label.toLowerCase().includes("course")) metric = "courses";
      else if (g.label.toLowerCase().includes("point")) metric = "points";
      else if (g.label.toLowerCase().includes("time")) metric = "hours";

      const target =
        metric === "points"
          ? targetPoints
          : metric === "courses"
          ? targetCourses
          : targetHours;
      const current =
        metric === "points"
          ? currentPoints
          : metric === "courses"
          ? currentCourses
          : currentHours;
      return {
        id: g.id,
        icon,
        color,
        title: g.label,
        subtitle: g.deadline ? `Ends ${new Date(g.deadline).toLocaleDateString()}` : "",
        current,
        target,
        unit: metric,
      };
    });

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const { goals: raw, completedCourses: completed } =
        await creditService.getGoalsWithProgress(user?.id);
      creditService.recordGoalMilestones(raw, user?.id);
      const mapped = mapGoals(raw);
      const maxStreak =
        raw.reduce((max, g) => Math.max(max, g.streakDays || 0), 0);
      const totalStudy = raw.reduce(
        (sum, g) => sum + Number(g.currentHours || 0),
        0
      );
      setGoals(mapped);
      setStreakDays(maxStreak);
      setCompletedCourses(completed);
      setStudyHours(totalStudy);
    } catch (err) {
      console.warn("LearningGoal: failed to load goals", err);
      setGoals([]);
      setStreakDays(0);
      setCompletedCourses(0);
      setStudyHours(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const stats = useMemo(
    () => [
      {
        icon: "checkmark-circle",
        color: Colors.secondary,
        value: String(completedCourses),
        label: "Courses Completed",
      },
      {
        icon: "timer",
        color: "#60A5FA",
        value: `${Math.round(studyHours * 10) / 10}h`,
        label: "Total Study Time",
      },
    ],
    [completedCourses, studyHours]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadGoals();
    } finally {
      setRefreshing(false);
    }
  }, [loadGoals]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  return (
    <Screen
      title="Learning Goals"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      customEdges={["top", "bottom"]}
      stickyHeader
      useScrollView={false}
      disableChildrenWrapper
    >
      <ScrollView
        contentContainerStyle={externalStyles.fullScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />
        }
      >
        <View style={externalStyles.scrollContent}>
          {loading ? (
            <View style={{ paddingVertical: Spacing.lg, alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
          ) : null}

          <View style={styles.streakCard}>
            <Ionicons name="flame" size={48} color="#FF6B35" />
            <Text style={styles.streakNumber}>{streakDays}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
            <Text style={styles.streakSubtitle}>Keep learning every day! 🎯</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Active Goals</Text>
          {(goals.length ? goals : []).map((goal, i) => (
            <GoalCard key={goal.id || i} goal={goal} />
          ))}
          {goals.length === 0 && !loading ? (
            <Text style={[TextStyles.body, { color: Colors.textSecondary }]}>No goals yet.</Text>
          ) : null}

          <Text
            style={[
              styles.sectionTitle,
              { marginTop: Spacing.lg, marginBottom: Spacing.md },
            ]}
          >
            Your Progress
          </Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <StatTile key={i} stat={stat} />
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    backgroundColor: TILE_BG,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: "center",
    marginTop: Spacing.md,
    elevation: 4,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: "bold",
    color: Colors.white,
    fontFamily: TextStyles.h1?.fontFamily ?? TextStyles.body.fontFamily,
  },
  streakLabel: { ...TextStyles.h4, color: Colors.white, marginTop: Spacing.xs },
  streakSubtitle: {
    ...TextStyles.body,
    color: Colors.white,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    color: Colors.textPrimary,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  goalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A2A35",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  goalTitle: {
    ...TextStyles.bodyMedium,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  goalSubtitle: {
    fontFamily: TextStyles.caption?.fontFamily ?? TextStyles.body.fontFamily,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#2A2A35",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
    borderRadius: 5,
  },
  progressText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  statTile: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: Spacing.base,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: Spacing.xs,
    fontFamily: TextStyles.h3?.fontFamily ?? TextStyles.body.fontFamily,
  },
  statLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
