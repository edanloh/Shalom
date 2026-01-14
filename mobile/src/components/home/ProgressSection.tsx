import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, TextStyles } from "../../constants";

interface WeeklyGoalProps {
  current: number;
  target: number;
  unit: "hours" | "courses" | "points" | "lessons" | "quizzes";
  label?: string;
  navigation: any;
}

const WeeklyGoal: React.FC<WeeklyGoalProps> = ({
  current,
  target,
  unit,
  label,
  navigation,
}) => {
  const progressPercentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const unitLabel =
    unit === "hours"
      ? " hours"
      : unit === "courses"
      ? " courses"
      : unit === "lessons"
      ? " lessons"
      : unit === "quizzes"
      ? " quizzes"
      : " pts";
  const formatValue = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    if (unit !== "hours") return `${value}`;
    const rounded = Math.round(value * 100) / 100;
    const text = rounded.toFixed(2);
    return text.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  };

  const displayCurrent = Math.min(current, target);

  return (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate("LearningGoalScreen")}
    >
      <View style={styles.row}>
        <Text style={TextStyles.bodyMedium}>{label || "Weekly Goal"}</Text>
        <Text style={TextStyles.caption}>
          {formatValue(displayCurrent)}/{formatValue(target)}
          {unitLabel}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressFill, { width: `${progressPercentage}%` }]}
        />
      </View>
    </Pressable>
  );
};

interface Achievement {
  id: string;
  title: string;
  value: string | number;
  color: string;
  icon?: string;
  navigationTarget?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  navigation: any;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  navigation,
}) => {
  const iconName = achievement.icon
    ? achievement.icon
    : achievement.title.includes("Streak")
    ? "flame"
    : achievement.title.includes("Certificates")
    ? "trophy"
    : "star";
  const iconColor =
    iconName === "flame"
      ? Colors.streakFire
      : iconName === "trophy"
      ? Colors.starGold
      : Colors.white;

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        achievement.navigationTarget &&
        navigation.navigate(achievement.navigationTarget)
      }
    >
      <Ionicons name={iconName as any} size={32} color={iconColor} />
      <Text style={[TextStyles.h2, { color: Colors.white, marginBottom: 0 }]}>
        {achievement.value}
      </Text>
      <Text
        style={[TextStyles.bodySmall, { color: Colors.white, opacity: 0.9 }]}
      >
        {achievement.title}
      </Text>
    </Pressable>
  );
};

type GoalItem = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: "hours" | "courses" | "points" | "lessons" | "quizzes";
  deadline?: string;
};

interface ProgressSectionProps extends WeeklyGoalProps {
  achievements: Achievement[];
  navigation: any;
  goals?: GoalItem[];
}

const ProgressSection: React.FC<ProgressSectionProps> = ({
  current,
  target,
  unit,
  label,
  achievements,
  goals,
  navigation,
}) => (
  <View
    style={{ gap: Spacing.lg, padding: Spacing.lg, paddingTop: Spacing.md }}
  >
    <View style={{ flexDirection: "row", gap: Spacing.lg }}>
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          navigation={navigation}
        />
      ))}
    </View>
    {Array.isArray(goals) ? (
      goals.length ? (
        <Pressable
          style={styles.compactGoalsCard}
          onPress={() => navigation.navigate("LearningGoalScreen")}
        >
          <View style={styles.compactGoalsHeader}>
            <Text style={styles.compactGoalsTitle}>Active goals</Text>
            <Text style={styles.compactGoalsCountText}>{goals.length}</Text>
          </View>
          <View style={styles.compactGoalsList}>
            {goals.slice(0, 2).map((goal) => {
              const progress = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
              const unitLabel =
                goal.unit === "hours"
                  ? "h"
                  : goal.unit === "courses"
                  ? "courses"
                  : goal.unit === "lessons"
                  ? "lessons"
                  : goal.unit === "quizzes"
                  ? "quizzes"
                  : "pts";
              const formatCompact = (value: number) => {
                if (!Number.isFinite(value)) return "0";
                if (goal.unit !== "hours") return `${value}`;
                const rounded = Math.round(value * 100) / 100;
                const text = rounded.toFixed(2);
                return text.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
              };
              const displayCurrent = Math.min(goal.current, goal.target);
              return (
                <View key={goal.id} style={styles.compactGoalItem}>
                  <View style={styles.compactGoalRow}>
                    <Text style={styles.compactGoalTitle} numberOfLines={1}>
                      {goal.label}
                    </Text>
                    <Text style={styles.compactGoalProgress}>
                      {formatCompact(displayCurrent)}/{formatCompact(goal.target)}{" "}
                      {unitLabel}
                    </Text>
                  </View>
                  <View style={styles.compactProgressTrack}>
                    <View
                      style={[
                        styles.compactProgressFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor:
                            goal.target > 0 && goal.current >= goal.target
                              ? "#22c55e"
                              : Colors.secondary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
            {goals.length > 2 ? (
              <Text style={styles.compactMoreText}>+{goals.length - 2} more</Text>
            ) : null}
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyGoals}>
          <Text style={styles.emptyGoalsText}>No active goals set</Text>
        </View>
      )
    ) : (
      <WeeklyGoal
        current={current}
        target={target}
        unit={unit}
        label={label}
        navigation={navigation}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.purple850,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginBottom: Spacing.md,
  },
  progressContainer: {
    height: 6,
    alignSelf: "stretch",
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.purple400,
  },
  compactGoalsCard: {
    backgroundColor: Colors.purple850,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  compactGoalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  compactGoalsTitle: {
    ...TextStyles.body,
    color: Colors.white,
    fontWeight: "700",
  },
  compactGoalsCountText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  compactGoalsList: {
    gap: Spacing.sm,
  },
  compactMoreText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: "right",
  },
  compactGoalItem: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.md,
  },
  compactGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  compactGoalTitle: {
    ...TextStyles.body,
    color: Colors.white,
    flex: 1,
    marginRight: Spacing.sm,
  },
  compactGoalProgress: {
    ...TextStyles.caption,
    color: Colors.white,
    opacity: 0.8,
  },
  compactProgressTrack: {
    height: 8,
    backgroundColor: "#2A2A35",
    borderRadius: 5,
    overflow: "hidden",
  },
  compactProgressFill: {
    height: "100%",
    backgroundColor: Colors.secondary,
  },
  emptyGoals: {
    backgroundColor: Colors.purple850,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  emptyGoalsText: {
    ...TextStyles.bodyMedium,
    color: Colors.textSecondary,
  },
});

export default ProgressSection;
