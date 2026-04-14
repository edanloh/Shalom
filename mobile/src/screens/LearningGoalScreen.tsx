import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  InteractionManager,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "@/components";
import { Colors, Spacing, TextStyles } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import externalStyles from "@styles/styles";
import creditService from "../services/creditService";
import { showToast } from "../components/common/Toast";
import { GoalTemplate, LearningGoal } from "../types";
import { useUser } from "../contexts/UserContext";

const CARD_BG = "#3A3A45";
const TILE_BG = "#5B38E3";

const formatProgressValue = (value: number, unit: "points" | "courses" | "hours" | "lessons" | "quizzes") => {
  if (!Number.isFinite(value)) return "0";
  if (unit !== "hours") return String(value);
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toFixed(2);
  return text.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const formatDeadlineLabel = (deadline?: string | null) => {
  if (!deadline) return "";
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return "";
  return `Ends ${parsed.toLocaleDateString()}`;
};

const GoalCard = ({ goal, onClear, clearing }: any) => {
  const displayCurrent = Math.min(goal.current, goal.target);
  const displayTarget = goal.target;

  return (
    <View
      style={[
        styles.goalCard,
        goal.isExpired && styles.goalCardExpired,
        goal.isCompleted && styles.goalCardCompleted,
      ]}
    >
    <View
      style={{
        marginBottom: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
      }}
    >
      <View style={styles.iconBadge}>
        <Ionicons name={goal.icon} size={20} color={goal.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
      </View>
      {goal.isCompleted ? (
        <Text style={styles.completedBadge}>Completed</Text>
      ) : goal.isExpired ? (
        <Text style={styles.expiredBadge}>Expired</Text>
      ) : null}
    </View>
    <View style={{ marginTop: Spacing.xs }}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min((goal.current / goal.target) * 100, 100)}%`,
              backgroundColor:
                goal.target > 0 && goal.current >= goal.target ? "#22c55e" : goal.color,
            },
          ]}
        />
      </View>
    <View style={styles.progressRow}>
      <Text style={styles.progressText}>
        {formatProgressValue(displayCurrent, goal.unit)} /{" "}
        {formatProgressValue(displayTarget, goal.unit)} {goal.unit}
      </Text>
      {typeof goal.rewardPoints === "number" ? (
        <Text style={styles.rewardText}>+{goal.rewardPoints} pts</Text>
      ) : null}
    </View>
      {goal.isExpired || goal.isCompleted ? (
        <View style={styles.clearRow}>
          <Pressable
            onPress={() => onClear?.(goal.id)}
            style={[styles.clearButton, clearing && styles.clearButtonDisabled]}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.clearButtonText}>Clear</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
    </View>
  );
};

const StatTile = ({ stat }: any) => (
  <View style={styles.statTile}>
    <Ionicons name={stat.icon} size={28} color={stat.color} />
    <Text style={styles.statNumber}>{stat.value}</Text>
    <Text style={styles.statLabel}>{stat.label}</Text>
  </View>
);

export default function LearningGoalScreen({ navigation }: any) {
  const { user: profileUser } = useUser();
  const goalUserId = profileUser?.uuid;
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [completedCourses, setCompletedCourses] = useState<number>(0);
  const [studyHours, setStudyHours] = useState<number>(0);
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [applyingGoals, setApplyingGoals] = useState(false);
  const [clearingGoalIds, setClearingGoalIds] = useState<Set<string>>(new Set());
  const [pendingGoalsToast, setPendingGoalsToast] = useState(false);

  const mapGoals = (raw: LearningGoal[]): any[] =>
    (raw || []).map((g) => {
      const targetPoints = Number(g.targetPoints ?? 0);
      const targetCourses = Number(g.targetCourses ?? 0);
      const targetHours = Number(g.targetHours ?? 0);
      const targetLessons = Number(g.targetLessons ?? 0);
      const targetQuizzes = Number(g.targetQuizzes ?? 0);
      const currentPoints = Number(g.currentPoints ?? 0);
      const currentCourses = Number(g.currentCourses ?? 0);
      const currentHours = Number(g.currentHours ?? 0);
      const currentLessons = Number(g.currentLessons ?? 0);
      const currentQuizzes = Number(g.currentQuizzes ?? 0);
      const icon = g.label.toLowerCase().includes("time")
        ? "time-outline"
        : g.label.toLowerCase().includes("course")
        ? "school-outline"
        : g.label.toLowerCase().includes("lesson")
        ? "book-outline"
        : g.label.toLowerCase().includes("quiz")
        ? "help-circle-outline"
        : "trophy-outline";
      const color =
        icon === "time-outline"
          ? "#60A5FA"
          : icon === "school-outline"
          ? "#34D399"
          : icon === "book-outline"
          ? "#F59E0B"
          : icon === "help-circle-outline"
          ? "#A78BFA"
          : Colors.yellow;
      let metric: "points" | "courses" | "hours" | "lessons" | "quizzes" = "hours";
      if (targetPoints > 0 || currentPoints > 0) metric = "points";
      else if (targetCourses > 0 || currentCourses > 0) metric = "courses";
      else if (targetLessons > 0 || currentLessons > 0) metric = "lessons";
      else if (targetQuizzes > 0 || currentQuizzes > 0) metric = "quizzes";
      else if (targetHours > 0 || currentHours > 0) metric = "hours";
      else if (g.label.toLowerCase().includes("course")) metric = "courses";
      else if (g.label.toLowerCase().includes("point")) metric = "points";
      else if (g.label.toLowerCase().includes("lesson")) metric = "lessons";
      else if (g.label.toLowerCase().includes("quiz")) metric = "quizzes";
      else if (g.label.toLowerCase().includes("time")) metric = "hours";

      const target =
        metric === "points"
          ? targetPoints
          : metric === "courses"
          ? targetCourses
          : metric === "lessons"
          ? targetLessons
          : metric === "quizzes"
          ? targetQuizzes
          : targetHours;
      const current =
        metric === "points"
          ? currentPoints
          : metric === "courses"
          ? currentCourses
          : metric === "lessons"
          ? currentLessons
          : metric === "quizzes"
          ? currentQuizzes
          : currentHours;
      return {
        id: g.id,
        icon,
        color,
        title: g.label,
        subtitle: formatDeadlineLabel(g.deadline),
        current,
        target,
        unit: metric,
        isActive: g.isActive,
        isExpired: g.isExpired,
        isCompleted: Boolean(g.completedAt),
        rewardPoints: typeof g.rewardPoints === "number" ? g.rewardPoints : 0,
        templateId: g.templateId,
      };
    });

  const loadGoals = useCallback(async () => {
    if (!goalUserId) {
      setGoals([]);
      setStreakDays(0);
      setCompletedCourses(0);
      setStudyHours(0);
      return;
    }
    setLoading(true);
    try {
      const { goals: raw, completedCourses: completed, totalTimeMinutes, streakDays: analyticsStreakDays } =
        await creditService.getGoalsWithProgress(goalUserId);
      const mapped = mapGoals(raw);
      const maxGoalStreak = raw.reduce((max, g) => Math.max(max, g.streakDays || 0), 0);
      const resolvedStreak = Math.max(Number(analyticsStreakDays || 0), maxGoalStreak);
      const hasAnalyticsMinutes =
        typeof totalTimeMinutes === "number" && Number.isFinite(totalTimeMinutes);
      const totalStudy = hasAnalyticsMinutes
        ? totalTimeMinutes / 60
        : raw.reduce((sum, g) => sum + Number(g.currentHours || 0), 0);
      setGoals(mapped);
      setStreakDays(resolvedStreak);
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
  }, [goalUserId]);

  const openGoalPicker = useCallback(async () => {
    if (!goalUserId) return;
    setTemplatesLoading(true);
    setGoalPickerOpen(true);
    try {
      const templates = await creditService.getGoalTemplates(goalUserId);
      setGoalTemplates(Array.isArray(templates) ? templates : []);
      setSelectedTemplateIds([]);
    } catch (err) {
      console.warn("LearningGoal: failed to load templates", err);
    } finally {
      setTemplatesLoading(false);
    }
  }, [goalUserId]);

  const activeGoals = goals.filter((g) => g.isActive || g.isExpired || g.isCompleted);
  const activeNonExpired = goals.filter(
    (g) => g.isActive && !g.isExpired && !g.isCompleted
  );
  const activeTemplateIds = new Set(
    activeNonExpired.map((g) => g.templateId).filter(Boolean) as string[]
  );
  const slotsLeft = Math.max(0, 3 - activeNonExpired.length);

  const toggleTemplate = (id: string) => {
    if (activeTemplateIds.has(id)) return;
    setSelectedTemplateIds((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= slotsLeft) return prev;
      return [...prev, id];
    });
  };

  const applyTemplates = useCallback(async () => {
    if (!goalUserId || !selectedTemplateIds.length || applyingGoals) return;
    setApplyingGoals(true);
    try {
      await creditService.createGoalsFromTemplates(selectedTemplateIds, goalUserId);
      setGoalPickerOpen(false);
      setPendingGoalsToast(true);
      await loadGoals();
    } catch (err) {
      console.warn("LearningGoal: failed to create goals", err);
    } finally {
      setApplyingGoals(false);
    }
  }, [selectedTemplateIds, goalUserId, loadGoals, applyingGoals]);

  const handleGoalPickerDismiss = useCallback(() => {
    if (!pendingGoalsToast) return;
    setPendingGoalsToast(false);
    InteractionManager.runAfterInteractions(() => {
      showToast({
        title: "Goals set",
        message: "Your new goals are active.",
        type: "success",
      });
    });
  }, [pendingGoalsToast]);

  const clearGoal = useCallback(
    async (goalId: string) => {
      if (clearingGoalIds.has(goalId)) return;
      setClearingGoalIds((prev) => new Set(prev).add(goalId));
      try {
        if (!goalUserId) return;
        await creditService.clearGoal(goalId, goalUserId);
        await loadGoals();
      } catch (err) {
        console.warn("LearningGoal: failed to clear goal", err);
      } finally {
        setClearingGoalIds((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });
      }
    },
    [goalUserId, loadGoals, clearingGoalIds]
  );

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
          ) : (
            <>
          <View style={styles.streakCard}>
            <Ionicons name="flame" size={48} color="#FF6B35" />
            <Text style={styles.streakNumber}>{streakDays}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
            <Text style={styles.streakSubtitle}>Keep learning every day! 🎯</Text>
          </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
          <View style={styles.setGoalsRow}>
            <Text style={styles.setGoalsCount}>{slotsLeft} left</Text>
            <Pressable
              style={[styles.setGoalsButton, slotsLeft === 0 && styles.setGoalsButtonDisabled]}
              onPress={openGoalPicker}
              disabled={slotsLeft === 0}
            >
              <Text style={styles.setGoalsText}>Set Goals</Text>
            </Pressable>
          </View>
        </View>
        {(activeGoals.length ? activeGoals : []).map((goal, i) => (
          <GoalCard
            key={goal.id || i}
            goal={goal}
            onClear={clearGoal}
            clearing={clearingGoalIds.has(goal.id)}
          />
        ))}
        {activeGoals.length === 0 && !loading ? (
          <Text
            style={[
              TextStyles.body,
              { color: Colors.textSecondary, textAlign: "center", marginTop: Spacing.md },
            ]}
          >
            No active goals.
          </Text>
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
          </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={goalPickerOpen}
        transparent
        animationType="fade"
        onDismiss={handleGoalPickerDismiss}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick up to {slotsLeft} goals</Text>
              <Pressable onPress={() => setGoalPickerOpen(false)}>
                <Ionicons name="close" size={22} color={Colors.white} />
              </Pressable>
            </View>
            {templatesLoading ? (
              <View style={{ paddingVertical: Spacing.lg, alignItems: "center" }}>
                <ActivityIndicator size="large" color={Colors.secondary} />
              </View>
            ) : (
              <ScrollView
                style={styles.templateListContainer}
                contentContainerStyle={styles.templateList}
                showsVerticalScrollIndicator={false}
              >
                {goalTemplates.map((template, index) => {
                  const isActive = activeTemplateIds.has(template.id);
                  const selected = selectedTemplateIds.includes(template.id);
                  return (
                    <Pressable
                      key={String(
                        template.id ?? `goal-template-${index}-${template.label ?? "template"}`
                      )}
                      style={[
                        styles.templateRow,
                        selected && styles.templateRowSelected,
                        isActive && styles.templateRowDisabled,
                      ]}
                      onPress={() => toggleTemplate(template.id)}
                      disabled={isActive}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.templateTitle}>{template.label}</Text>
                        {template.description ? (
                          <Text style={styles.templateSubtitle}>{template.description}</Text>
                        ) : null}
                        <Text style={styles.templateMeta}>
                          {template.durationDays || 7} days • {template.rewardPoints || 0} pts
                        </Text>
                      </View>
                      <Ionicons
                        name={isActive || selected ? "checkbox" : "square-outline"}
                        size={22}
                        color={
                          isActive
                            ? Colors.textMuted
                            : selected
                            ? Colors.secondary
                            : Colors.textSecondary
                        }
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.modalFooter}>
              <Pressable
                style={[
                  styles.applyButton,
                  (!selectedTemplateIds.length || templatesLoading || applyingGoals) &&
                    styles.applyButtonDisabled,
                ]}
                disabled={!selectedTemplateIds.length || templatesLoading || applyingGoals}
                onPress={applyTemplates}
              >
                {applyingGoals ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.applyButtonText}>Apply Goals</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    // marginBottom: Spacing.md,
  },
  goalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  goalCardExpired: {
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.4)",
  },
  goalCardCompleted: {
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
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
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rewardText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  expiredBadge: {
    fontSize: 11,
    color: "#FF6B35",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  completedBadge: {
    fontSize: 11,
    color: "#22c55e",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  clearButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    minWidth: 56,
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: "600",
  },
  clearButtonDisabled: {
    opacity: 0.6,
  },
  clearRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  setGoalsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  setGoalsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
  },
  setGoalsButtonDisabled: {
    opacity: 0.5,
  },
  setGoalsText: {
    color: Colors.white,
    fontWeight: "600",
  },
  setGoalsCount: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: CARD_BG,
    padding: Spacing.lg,
    borderRadius: 24,
    gap: Spacing.md,
    width: "90%",
    maxHeight: "80%",
  },
  modalFooter: {
    paddingBottom: Spacing.sm,
  },
  templateListContainer: {
    maxHeight: 360,
    flexShrink: 1,
  },
  templateList: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    ...TextStyles.h4,
    color: Colors.white,
  },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: "#2A2A35",
    gap: Spacing.md,
  },
  templateRowSelected: {
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  templateRowDisabled: {
    opacity: 0.6,
  },
  templateTitle: {
    ...TextStyles.bodyMedium,
    color: Colors.textPrimary,
  },
  templateSubtitle: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  templateMeta: {
    ...TextStyles.caption,
    color: Colors.textMuted,
    marginTop: 6,
  },
  applyButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: Colors.white,
    fontWeight: "700",
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
