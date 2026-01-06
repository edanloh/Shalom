import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Colors, Spacing, BorderRadius, TextStyles } from "../../constants";

interface WeeklyGoalProps {
  currentHours: number;
  targetHours: number;
  navigation: any;
}

const WeeklyGoal: React.FC<WeeklyGoalProps> = ({
  currentHours,
  targetHours,
  navigation,
}) => {
  const progressPercentage = Math.min((currentHours / targetHours) * 100, 100);

  return (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate("LearningGoalScreen")}
    >
      <View style={styles.row}>
        <Text style={TextStyles.bodyMedium}>Weekly Goal</Text>
        <Text style={TextStyles.caption}>
          {currentHours}h/{targetHours}h
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
  currentHours,
  targetHours,
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
      currentHours={currentHours}
      targetHours={targetHours}
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
