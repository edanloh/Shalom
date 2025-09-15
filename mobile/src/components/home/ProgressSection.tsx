import React from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../constants";

// ---------- Weekly Goal ----------
interface WeeklyGoalProps {
  currentHours: number;
  targetHours: number;
}

const WeeklyGoal: React.FC<WeeklyGoalProps> = ({
  currentHours,
  targetHours,
}) => {
  const progressPercentage = Math.min((currentHours / targetHours) * 100, 100);

  return (
    <View style={styles.goalContainer}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>Weekly Goal</Text>
        <Text style={styles.goalHours}>
          {currentHours}h/{targetHours}h
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBar, { width: `${progressPercentage}%` }]}
        />
      </View>
    </View>
  );
};

// ---------- Achievements ----------
interface Achievement {
  id: string;
  // icon: string;
  title: string;
  value: string | number;
  color: string;
}

interface AchievementCardProps {
  achievement: Achievement;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  // const getCardColor = () => {
  //   if (achievement.title.includes("Streak")) {
  //     return Colors.streakCardBg;
  //   } else if (achievement.title.includes("Certificates")) {
  //     return Colors.certificateCardBg;
  //   }
  //   return achievement.color;
  // };

  // Map achievement title to asset logo
  const getLogo = () => {
    if (achievement.title.includes("Streak")) {
      return require("../../../assets/streak.png");
    } else if (achievement.title.includes("Certificates")) {
      return require("../../../assets/certificates.png");
    }
    // Default icon (use placeholder or shalom.png)
    return require("../../../assets/placeholder.png");
  };

  return (
    <View style={[styles.achievementCard]}>
      <View style={styles.iconContainer}>
        <Image source={getLogo()} style={{ width: 32, height: 32 }} />
      </View>
      <Text style={styles.achievementValue}>{achievement.value}</Text>
      <Text style={styles.achievementTitle}>{achievement.title}</Text>
    </View>
  );
};

interface ProgressSectionProps extends WeeklyGoalProps {
  achievements: Achievement[];
}

// ---------- Combined Section ----------
const ProgressSection: React.FC<ProgressSectionProps> = ({
  currentHours,
  targetHours,
  achievements,
}) => {
  return (
    <View style={styles.sectionContainer}>
      <View style={styles.achievementsRow}>
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </View>
      <WeeklyGoal currentHours={currentHours} targetHours={targetHours} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  // Weekly Goal styles
  goalContainer: {
    backgroundColor: Colors.purple850,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  goalTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  goalHours: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.purple400,
    borderRadius: BorderRadius.sm,
  },
  // Achievements styles
  achievementsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.base,
  },
  achievementCard: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
    backgroundColor: Colors.purple850
  },
  iconContainer: {
    marginBottom: Spacing.md,
    // React Native Web compatible shadow
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  achievementValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize["3xl"],
    color: Colors.white,
    marginBottom: 4,
    textAlign: "center",
  },
  achievementTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    textAlign: "center",
    opacity: 0.9,
  },
});

export default ProgressSection;
