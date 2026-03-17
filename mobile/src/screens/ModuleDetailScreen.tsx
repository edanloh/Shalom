import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
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
import Screen from "@/components/common/Screen";

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

  const [moduleDetail, setModuleDetail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(
    null,
  );
  const [currentSection, setCurrentSection] = useState<CourseSection | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) {
        if (mounted) setIsEnrolled(false);
        return;
      }
      try {
        const enrolled = await courseService.isUserEnrolledInCourse(
          userId,
          courseId,
        );
        if (mounted) setIsEnrolled(enrolled);
      } catch {
        if (mounted) setIsEnrolled(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId, userId]);

  // Reload when screen comes into focus AND when items are completed
  useFocusEffect(
    React.useCallback(() => {
      if (!userId) return;

      const handleFocus = async () => {
        // Check if we're returning from a completed item
        const params = route.params as any;
        const hasCompletion =
          params?.videoCompleted ||
          params?.quizCompleted ||
          params?.documentCompleted ||
          params?.timestamp;

        if (hasCompletion) {
          console.log("✅ Item completed detected, forcing refresh...", {
            videoCompleted: params?.videoCompleted,
            quizCompleted: params?.quizCompleted,
            documentCompleted: params?.documentCompleted,
            completedItemId:
              params?.completedVideoId ||
              params?.completedQuizId ||
              params?.completedDocumentId,
            timestamp: params?.timestamp,
          });

          // Force reload to get updated completion status
          await fetchCourseContent();

          // Clear the completion flags after refresh completes
          navigation.setParams({
            videoCompleted: undefined,
            quizCompleted: undefined,
            documentCompleted: undefined,
            completedVideoId: undefined,
            completedQuizId: undefined,
            completedDocumentId: undefined,
            timestamp: undefined,
          });
        } else {
          // Normal focus refresh
          await fetchCourseContent();
        }
      };

      handleFocus();
    }, [courseId, userId, route.params]),
  );

  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      console.log("📊 Fetching course content...", {
        courseId,
        userId,
        sectionId,
        timestamp: new Date().toISOString()
      });

      // Add timestamp to bust any potential caching
      const data = await moduleService.getModuleDetail(courseId, userId);
      
      console.log("📦 Course content fetched:", {
        sectionsCount: data.sections.length,
        currentSectionId: sectionId,
        sections: data.sections.map((s: any) => ({
          id: s.id,
          title: s.title,
          itemsCount: s.items?.length || 0,
          completedItems: s.items?.filter((i: any) => i.is_completed).length || 0,
          items: s.items?.map((item: any) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            is_completed: item.is_completed
          })),
          isCompleted: s.module_is_completed
        }))
      });
      
      setCourseContent(data);

      // If we have a current section, try to maintain it, otherwise use sectionId or first section
      const section = currentSection
        ? moduleService.getSectionById(data.sections, currentSection.id) ||
          (sectionId
            ? moduleService.getSectionById(data.sections, sectionId)
            : data.sections[0])
        : sectionId
          ? moduleService.getSectionById(data.sections, sectionId)
          : data.sections[0];

      setCurrentSection(section);

      if (section) {
        const completedItems =
          section.items?.filter((i: ModuleItem) => i.is_completed).length || 0;
        const totalItems = section.items?.length || 0;
        console.log("📊 Section loaded:", {
          sectionId: section.id,
          title: section.title,
          totalItems,
          completedItems,
          moduleCompleted: (section as any).module_is_completed,
        });
      }
    } catch (error) {
      console.error("Error fetching course content:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    return moduleService.formatDuration(seconds);
  };

  const getItemProgress = (itemId: string, itemType: ModuleItem["type"]) => {
    if (!courseContent) return null;
    return moduleService.getItemProgress(
      itemId,
      itemType,
      courseContent.userProgress,
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
        {
          text: "Go to course",
          onPress: () => navigation.navigate("CourseDetail", { courseId }),
        },
      ],
    );
    return false;
  };

  const handleItemPress = async (item: ModuleItem) => {
    if (!(await requireEnrollment())) return;

    // Check if all previous items are completed
    if (currentSection?.items) {
      const itemIndex = currentSection.items.findIndex((i) => i.id === item.id);
      if (itemIndex > 0) {
        const previousItems = currentSection.items.slice(0, itemIndex);
          const incompletePrevious = previousItems.filter(
            (i) => !moduleService.isItemCompleted(i, courseContent?.userProgress),
          );

        if (incompletePrevious.length > 0) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert(
            "Complete Previous Items First",
            `Please complete "${incompletePrevious[0].title}" before accessing this item.`,
            [{ text: "OK", style: "default" }],
          );
          return;
        }
      }
    }

    console.log("📍 Navigating to item:", {
      type: item.type,
      id: item.id,
      title: item.title,
      isCompleted: item.is_completed,
    });

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
    } else if (["pdf", "document", "ppt"].includes(item.type)) {
      navigation.navigate("DocumentView", {
        documentId: item.id,
        courseId,
        sectionId: currentSection?.id,
        userId,
        documentType: item.type,
      });
    }
  };

  const getNextSection = (): CourseSection | null => {
    if (!courseContent || !currentSection) return null;
    const currentIndex = courseContent.sections.findIndex(
      (s) => s.id === currentSection.id,
    );
    if (
      currentIndex === -1 ||
      currentIndex === courseContent.sections.length - 1
    ) {
      return null;
    }
    return courseContent.sections[currentIndex + 1];
  };

  const canGoToNextSection = (): boolean => {
    if (!getNextSection()) return false;
    // Can only go to next section if current module is completed
    return moduleService.isSectionCompleted(
      currentSection as CourseSection,
      courseContent?.userProgress,
    );
  };

  const getPreviousSection = (): CourseSection | null => {
    if (!courseContent || !currentSection) return null;
    const currentIndex = courseContent.sections.findIndex(
      (s) => s.id === currentSection.id,
    );
    if (currentIndex <= 0) return null;
    return courseContent.sections[currentIndex - 1];
  };

  const handleNextSection = () => {
    const nextSection = getNextSection();
    if (nextSection) {
      // Check if current section is completed
      const isCurrentModuleCompleted = moduleService.isSectionCompleted(
        currentSection as CourseSection,
        courseContent?.userProgress,
      );
      if (!isCurrentModuleCompleted) {
        Alert.alert(
          "Complete Current Module First",
          `Please complete all lessons in "${currentSection?.title}" before moving to the next module.`,
          [{ text: "OK", style: "default" }],
        );
        return;
      }
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
    const isCompleted = moduleService.isItemCompleted(
      item,
      courseContent?.userProgress,
    );

    // Check if item is locked (previous items not completed)
    const isLocked = currentSection?.items
      ? (() => {
          const itemIndex = currentSection.items.findIndex(
            (i) => i.id === item.id,
          );
          if (itemIndex > 0) {
            const previousItems = currentSection.items.slice(0, itemIndex);
            return previousItems.some(
              (i) => !moduleService.isItemCompleted(i, courseContent?.userProgress),
            );
          }
          return false;
        })()
      : false;

    return (
      <TouchableOpacity
        key={String(item.id ?? `module-item-${index}-${item.title ?? item.type ?? "item"}`)}
        style={[styles.itemCard, isLocked && styles.itemCardLocked]}
        onPress={() => handleItemPress(item)}
        activeOpacity={isLocked ? 1 : 0.7}
      >
        <View style={styles.itemIconContainer}>
          {item.type === "video" ? (
            <Ionicons name="play-circle" size={24} color={Colors.purple400} />
          ) : ["pdf", "document", "ppt"].includes(item.type) ? (
            <Ionicons name="document-text" size={24} color={Colors.purple400} />
          ) : (
            <Ionicons name="help-circle" size={24} color={Colors.yellow} />
          )}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
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
              {["pdf", "document", "ppt"].includes(item.type) && (
                <View style={styles.itemMeta}>
                  <Ionicons
                    name="newspaper-outline"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.itemMetaText}>
                    {item.type === "pdf" ? "PDF" : item.type === "ppt" ? "PPT" : "Document"}
                  </Text>
                </View>
              )}
            </View>
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

        <View style={styles.badgeContainer}>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={Colors.green}
              />
              <Text style={styles.completedText} numberOfLines={1}>
                Completed
              </Text>
            </View>
          )}
          {isLocked && (
            <View style={styles.lockedBadge}>
              <Ionicons
                name="lock-closed"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.lockedBadgeText} numberOfLines={1}>
                Locked
              </Text>
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
    <Screen
      title={courseContent.course.title}
      subtitle={currentSection.title}
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => navigation.goBack()}
    >
      {/* Section Info */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="book-outline" size={24} color={Colors.purple400} />
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
                  (i: ModuleItem) => i.type === "video",
                ).length
              }{" "}
              videos
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons
              name="newspaper-outline"
              size={18}
              color={Colors.purple400}
            />
            <Text style={styles.statText}>
              {
                currentSection.items.filter((i: ModuleItem) =>
                  ["pdf", "document", "ppt"].includes(i.type),
                ).length
              }{" "}
              Documents
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
                  (i: ModuleItem) => i.type === "quiz",
                ).length
              }{" "}
              quizzes
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={Colors.purple400} />
            <Text style={styles.statText}>
              {currentSection.duration_minutes || 0} min
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
                courseContent.userProgress,
              )}
              %
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${moduleService.getSectionCompletionPercentage(
                    currentSection,
                    courseContent.userProgress,
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
                {new Date(
                  (currentSection as any).module_completed_at,
                ).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content Items */}
      <View style={styles.contentSection}>
        <Text style={styles.contentTitle}>Lessons</Text>
        {currentSection.items && currentSection.items.length > 0 ? (
          currentSection.items.map((item: ModuleItem, index: number) =>
            renderItem(item, index),
          )
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="folder-open-outline"
              size={48}
              color={Colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>
              No lessons available in this module yet
            </Text>
          </View>
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
              color={
                getPreviousSection() ? Colors.secondary : Colors.textSecondary
              }
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
              !canGoToNextSection() && styles.navButtonDisabled,
            ]}
            onPress={handleNextSection}
            disabled={!canGoToNextSection()}
            activeOpacity={0.7}
          >
            <View style={styles.navButtonContent}>
              <Text
                style={[
                  styles.navLabel,
                  styles.navLabelRight,
                  !canGoToNextSection() && styles.navLabelDisabled,
                ]}
              >
                NEXT MODULE
              </Text>
              {getNextSection() ? (
                <>
                  <Text
                    style={[styles.navButtonText, styles.navButtonTextRight]}
                    numberOfLines={2}
                  >
                    {getNextSection()?.title}
                  </Text>
                  {!canGoToNextSection() && (
                    <Text
                      style={[
                        styles.navButtonTextDisabled,
                        styles.navButtonTextRight,
                        styles.lockedText,
                      ]}
                    >
                      🔒 Complete this module first
                    </Text>
                  )}
                </>
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
              color={
                canGoToNextSection() ? Colors.secondary : Colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  );
};
const styles = StyleSheet.create({
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
  progressSection: {
    backgroundColor: Colors.textInputBg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
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
    flex: 1,
    flexShrink: 1,
  },
  sectionCard: {
    backgroundColor: Colors.textInputBg,
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
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray500,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "47%",
    minWidth: 0,
  },
  statDivider: {
    display: "none",
  },
  statText: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 6,
    fontWeight: "500",
    flexShrink: 1,
  },
  contentSection: {
    marginTop: Spacing.xl,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.textInputBg,
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
    minWidth: 0,
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
    minWidth: 0,
  },
  itemMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
  },
  itemMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
    flexShrink: 0,
    maxWidth: 120,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.green + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 120,
  },
  completedText: {
    fontSize: 11,
    color: Colors.green,
    marginLeft: 4,
    fontWeight: "600",
    flexShrink: 1,
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
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.textInputBg,
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
  lockedText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  itemCardLocked: {
    opacity: 0.6,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.textSecondary + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 110,
  },
  lockedBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: "600",
    flexShrink: 1,
  },
});

export default ModuleDetailScreen;
