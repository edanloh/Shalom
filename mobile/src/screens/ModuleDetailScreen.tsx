import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, TextStyles } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";
import { moduleService, courseService } from "@/services";
import type {
  ModuleItem,
  CourseSection,
  ModuleDetailResponse,
} from "@/services";

const { width } = Dimensions.get("window");

type ModuleDetailNavigationProp = StackNavigationProp<
  MainStackParamList,
  "ModuleDetail"
>;
type CourseContent = ModuleDetailResponse["data"];

const ModuleDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<ModuleDetailNavigationProp>();
  const { courseId, sectionId, userId } = route.params as any;
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(
    null
  );
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(
    null
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) { 
        if (mounted) setIsEnrolled(false);
        return; 
      }
      try {
        const enrolled = await courseService.isUserEnrolledInCourse(userId, courseId);
        if (mounted) setIsEnrolled(enrolled);
      } catch {
        if (mounted) setIsEnrolled(false);
      }
    })();
    return () => { mounted = false; };
  }, [courseId, userId]);

  useEffect(() => {
    fetchCourseContent();
  }, [courseId]);

  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      const data = await moduleService.getModuleDetail(courseId, userId);
      setCourseContent(data);

      const section = sectionId
        ? moduleService.getSectionById(data.sections, sectionId)
        : data.sections[0];

      setCurrentSection(section);
    } catch (error) {
      console.error("Error fetching course content:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    return moduleService.formatDuration(seconds);
  };

  const getItemProgress = (itemId: string, itemType: "video" | "quiz") => {
    if (!courseContent) return null;
    return moduleService.getItemProgress(
      itemId,
      itemType,
      courseContent.userProgress
    );
  };

  const requireEnrollment = async (): Promise<boolean> => {
    if (isEnrolled) return true;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Enrollment required",
      "Please enroll to access lessons and quizzes.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Go to course", onPress: () => navigation.navigate("CourseDetail", { courseId }) },
      ]
    );
    return false;
  };

  const handleItemPress = async (item: ModuleItem) => {
    if (!(await requireEnrollment())) return;

    if (item.type === "video") {
      navigation.navigate("LessonPlayer", {
        videoId: item.id,
        courseId,
        sectionId: currentSection?.id,
        userId,
      });
    } else if (item.type === "quiz") {
      navigation.navigate("QuizScreen", {
        quizId: item.id,
        courseId,
        sectionId: currentSection?.id,
        userId,
      });
    }
  };

  const getNextSection = (): CourseSection | null => {
    if (!courseContent || !currentSection) return null;
    const currentIndex = courseContent.sections.findIndex(
      (s) => s.id === currentSection.id
    );
    if (currentIndex === -1 || currentIndex === courseContent.sections.length - 1) {
      return null;
    }
    return courseContent.sections[currentIndex + 1];
  };

  const getPreviousSection = (): CourseSection | null => {
    if (!courseContent || !currentSection) return null;
    const currentIndex = courseContent.sections.findIndex(
      (s) => s.id === currentSection.id
    );
    if (currentIndex <= 0) return null;
    return courseContent.sections[currentIndex - 1];
  };

  const handleNextSection = () => {
    const nextSection = getNextSection();
    if (nextSection) {
      setCurrentSection(nextSection);
    }
  };

  const handlePreviousSection = () => {
    const previousSection = getPreviousSection();
    if (previousSection) {
      setCurrentSection(previousSection);
    }
  };

  const renderItem = (item: ModuleItem, index: number) => {
    const progress = getItemProgress(item.id, item.type);
    const isCompleted =
      item.type === "video"
        ? (progress as any)?.is_completed
        : (progress as any)?.is_passed;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemIconContainer}>
          {item.type === "video" ? (
            <Ionicons name="play-circle" size={24} color={Colors.purple400} />
          ) : (
            <Ionicons name="document-text" size={24} color={Colors.yellow} />
          )}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            {/* <Text style={styles.itemIndex}></Text> */}
            <Text style={styles.itemTitle} numberOfLines={2}>
              {index + 1}. {item.title}
            </Text>
          </View>

          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.itemFooter}>
            <View style={styles.itemMetaContainer}>
              {item.type === "video" && item.duration_seconds && (
                <View style={styles.itemMeta}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.itemMetaText}>
                    {formatDuration(item.duration_seconds)}
                  </Text>
                </View>
              )}
              {item.type === "quiz" && (
                <View style={styles.itemMeta}>
                  <Ionicons
                    name="help-circle-outline"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.itemMetaText}>Quiz</Text>
                </View>
              )}
            </View>

            {isCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.green}
                />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>

          {item.type === "video" && progress && !isCompleted && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        ((progress as any).watch_time_seconds /
                          (item.duration_seconds || 1)) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.purple400} />
        <Text style={styles.loadingText}>Loading course content...</Text>
      </SafeAreaView>
    );
  }

  if (!courseContent || !currentSection) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={Colors.textSecondary}
        />
        <Text style={styles.errorText}>Course content not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchCourseContent}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {courseContent.course.title}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentSection.title}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons
                name="book-outline"
                size={24}
                color={Colors.purple400}
              />
            </View>
            <Text style={styles.sectionTitle}>{currentSection.title}</Text>
          </View>

          {currentSection.description && (
            <Text style={styles.sectionDescription}>
              {currentSection.description}
            </Text>
          )}

          <View style={styles.sectionStats}>
            <View style={styles.statItem}>
              <Ionicons
                name="videocam-outline"
                size={18}
                color={Colors.purple400}
              />
              <Text style={styles.statText}>
                {
                  currentSection.items.filter(
                    (i: ModuleItem) => i.type === "video"
                  ).length
                }{" "}
                videos
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={Colors.purple400}
              />
              <Text style={styles.statText}>
                {
                  currentSection.items.filter(
                    (i: ModuleItem) => i.type === "quiz"
                  ).length
                }{" "}
                quizzes
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={18}
                color={Colors.purple400}
              />
              <Text style={styles.statText}>
                {currentSection.duration_minutes} min
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Section - Module Progress */}
        {courseContent.userProgress && currentSection && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Module Progress</Text>
              <Text style={styles.progressPercentage}>
                {moduleService.getSectionCompletionPercentage(
                  currentSection,
                  courseContent.userProgress
                )}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${moduleService.getSectionCompletionPercentage(
                      currentSection,
                      courseContent.userProgress
                    )}%`,
                  },
                ]}
              />
            </View>
            {(currentSection as any).module_is_completed && (
              <View style={styles.moduleCompletedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.green}
                />
                <Text style={styles.moduleCompletedText}>
                  Module Completed on{" "}
                  {new Date((currentSection as any).module_completed_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Content Items */}
        <View style={styles.contentSection}>
          <Text style={styles.contentTitle}>Lessons</Text>
          {currentSection.items.map((item: ModuleItem, index: number) =>
            renderItem(item, index)
          )}
        </View>

        {/* Module Navigation */}
        {courseContent.sections.length > 1 && (
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[
                styles.navButton,
                !getPreviousSection() && styles.navButtonDisabled,
              ]}
              onPress={handlePreviousSection}
              disabled={!getPreviousSection()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={getPreviousSection() ? Colors.purple400 : Colors.textSecondary}
              />
              <View style={styles.navButtonContent}>
                <Text
                  style={[
                    styles.navLabel,
                    !getPreviousSection() && styles.navLabelDisabled,
                  ]}
                >
                  PREVIOUS MODULE
                </Text>
                {getPreviousSection() ? (
                  <Text style={styles.navButtonText} numberOfLines={2}>
                    {getPreviousSection()?.title}
                  </Text>
                ) : (
                  <Text style={styles.navButtonTextDisabled}>
                    No previous module
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                !getNextSection() && styles.navButtonDisabled,
              ]}
              onPress={handleNextSection}
              disabled={!getNextSection()}
              activeOpacity={0.7}
            >
              <View style={styles.navButtonContent}>
                <Text
                  style={[
                    styles.navLabel,
                    styles.navLabelRight,
                    !getNextSection() && styles.navLabelDisabled,
                  ]}
                >
                  NEXT MODULE
                </Text>
                {getNextSection() ? (
                  <Text
                    style={[styles.navButtonText, styles.navButtonTextRight]}
                    numberOfLines={2}
                  >
                    {getNextSection()?.title}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.navButtonTextDisabled,
                      styles.navButtonTextRight,
                    ]}
                  >
                    No next module
                  </Text>
                )}
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={getNextSection() ? Colors.purple400 : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
    color: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray600,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray600,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  progressSection: {
    backgroundColor: Colors.gray600,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.purple400,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.gray500,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.purple400,
    borderRadius: 4,
  },
  moduleCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray500,
  },
  moduleCompletedText: {
    fontSize: 13,
    color: Colors.green,
    marginLeft: 6,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: Colors.gray600,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.purple400 + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  sectionDescription: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  sectionStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray500,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.gray500,
  },
  statText: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 6,
    fontWeight: "500",
  },
  contentSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: Colors.gray600,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.green + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 11,
    color: Colors.green,
    marginLeft: 4,
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray500,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.purple400,
    borderRadius: 2,
  },
  navigationContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.gray600,
    borderRadius: 10,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonContent: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  navLabel: {
    fontSize: 11,
    color: Colors.purple400,
    marginBottom: 4,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  navLabelRight: {
    textAlign: "right",
  },
  navLabelDisabled: {
    color: Colors.textSecondary,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  navButtonTextRight: {
    textAlign: "right",
  },
  navButtonTextDisabled: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default ModuleDetailScreen;
