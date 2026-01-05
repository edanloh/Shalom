import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Screen } from "@/components";
import { Colors, Spacing, TextStyles } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import externalStyles from "@styles/styles";

const CARD_BG = "#3A3A45";
const TILE_BG = "#5B38E3";

const GOALS = [
  {
    icon: "trophy-outline",
    color: Colors.yellow,
    title: "Weekly Points Goal",
    subtitle: "Earn points by learning",
    current: 300,
    target: 500,
    unit: "points",
  },
  {
    icon: "time-outline",
    color: "#60A5FA",
    title: "Weekly Study Time",
    subtitle: "3 hours per week",
    current: 145,
    target: 180,
    unit: "minutes",
  },
  {
    icon: "school-outline",
    color: "#34D399",
    title: "Monthly Course Goal",
    subtitle: "Complete courses this month",
    current: 1,
    target: 3,
    unit: "courses",
  },
];

const STATS = [
  {
    icon: "checkmark-circle",
    color: Colors.secondary,
    value: "12",
    label: "Courses Completed",
  },
  { icon: "timer", color: "#60A5FA", value: "24h", label: "Total Study Time" },
];

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
  return (
    <Screen
      title="Learning Goals"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      customEdges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={externalStyles.fullScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.streakCard}>
          <Ionicons name="flame" size={48} color="#FF6B35" />
          <Text style={styles.streakNumber}>7</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
          <Text style={styles.streakSubtitle}>Keep learning every day! 🎯</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
          Active Goals
        </Text>
        {GOALS.map((goal, i) => (
          <GoalCard key={i} goal={goal} />
        ))}

        <Text
          style={[
            styles.sectionTitle,
            { marginTop: Spacing.lg, marginBottom: Spacing.md },
          ]}
        >
          Your Progress
        </Text>
        <View style={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <StatTile key={i} stat={stat} />
          ))}
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
