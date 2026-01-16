import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";

interface CourseCompletionCardProps {
  courseId: string;
  navigation: StackNavigationProp<MainStackParamList, any>;
  onBackToCourse?: () => void;
}

/**
 * CourseCompletionCard Component
 * 
 * Displays a congratulatory message when user completes the last item in a course.
 * Shows a button to navigate back to the course detail page.
 * 
 * @param courseId - The ID of the completed course
 * @param navigation - Navigation object for routing
 * @param onBackToCourse - Optional callback before navigation
 */
export const CourseCompletionCard: React.FC<CourseCompletionCardProps> = ({
  courseId,
  navigation,
  onBackToCourse,
}) => {
  const handleBackToCourse = () => {
    if (onBackToCourse) {
      onBackToCourse();
    }
    navigation.navigate("CourseDetail", { 
      courseId,
      courseCompleted: true,
    } as any);
  };

  return (
    <View style={styles.courseCompletionCard}>
      <View style={styles.courseCompletionHeader}>
        <Ionicons name="trophy" size={28} color={Colors.starGold} />
        <Text style={styles.courseCompletionTitle}>Course Completed!</Text>
      </View>
      
      <Text style={styles.courseCompletionText}>
        Congratulations! You've completed all lessons in this course. Check your
        certificate on the course page.
      </Text>

      <TouchableOpacity
        style={styles.backToCourseButton}
        onPress={handleBackToCourse}
        activeOpacity={0.8}
      >
        <Ionicons name="home" size={20} color={Colors.white} />
        <Text style={styles.backToCourseButtonText}>Back to Course</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  courseCompletionCard: {
    backgroundColor: Colors.textInputBg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.starGold + "40",
  },
  courseCompletionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  courseCompletionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  courseCompletionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  backToCourseButton: {
    backgroundColor: Colors.purple600,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  backToCourseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});
