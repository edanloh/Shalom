import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Colors, Spacing, BorderRadius, TextStyles } from "../../constants";

interface WeeklyGoalProps {
  current: number;
  target: number;
  unit: "hours" | "courses" | "points";
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
  const unitLabel = unit === "hours" ? " hours" : unit === "courses" ? " courses" : " pts";
  const formatValue = (value: number) => `${value}`;

  return (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate("LearningGoalScreen")}
    >
      <View style={styles.row}>
        <Text style={TextStyles.bodyMedium}>{label || "Weekly Goal"}</Text>
        <Text style={TextStyles.caption}>
          {formatValue(current)}/{formatValue(target)}
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
  navigationTarget?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  navigation: any;
}

const ACHIEVEMENT_LOGOS = {
  Streak: require("../../../assets/streak.png"),
  Certificates: require("../../../assets/certificates.png"),
  default: require("../../../assets/placeholder_icon.png"),
} as const;

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  navigation,
}) => {
  const logoKey = achievement.title.includes("Streak")
    ? "Streak"
    : achievement.title.includes("Certificates")
    ? "Certificates"
    : "default";

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        achievement.navigationTarget &&
        navigation.navigate(achievement.navigationTarget)
      }
    >
      <Image source={ACHIEVEMENT_LOGOS[logoKey]} style={styles.icon} />
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

interface ProgressSectionProps extends WeeklyGoalProps {
  achievements: Achievement[];
  navigation: any;
}

const ProgressSection: React.FC<ProgressSectionProps> = ({
  current,
  target,
  unit,
  label,
  achievements,
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
    <WeeklyGoal
      current={current}
      target={target}
      unit={unit}
      label={label}
      navigation={navigation}
    />
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
  icon: {
    width: 32,
    height: 32,
  },
});

export default ProgressSection;
