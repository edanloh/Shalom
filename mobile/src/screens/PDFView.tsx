// UPDATED: PDFView Screen with proper completion handling
// Key changes:
// 1. Refetch module data after PDF completion
// 2. Pass completion state when navigating back
// 3. Invalidate caches appropriately

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, Spacing, TextStyles } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";
import Screen from "@/components/common/Screen";
import ActionButton from "@/components/ActionButton";
import { CourseCompletionCard } from "@/components";
import { pdfService } from "@/services/pdfService";
import { moduleService } from "@/services/moduleService";
import { useCourseNavigation } from "@/hooks";
import type { ModuleItem, CourseSection } from "@/services/moduleService";

type PDFViewNavigationProp = StackNavigationProp<MainStackParamList, "PDFView">;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// UPDATED: PDFView Screen with proper completion handling
// Key changes:
// 1. Refetch module data after PDF completion
// 2. Pass completion state when navigating back
// 3. Invalidate caches appropriately

const PDFView = () => {
  const route = useRoute();
  const navigation = useNavigation<PDFViewNavigationProp>();
  const { pdfId, courseId, sectionId, userId } = route.params as any;

  const [loading, setLoading] = useState(true);
  const [pdfDetail, setPdfDetail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  const {
    nextItem: nextItemInModule,
    previousItem: prevItemInModule,
    isLastItem,
    refetch: refetchNavigation,
  } = useCourseNavigation(courseId, userId, pdfId, "pdf", sectionId);

  const [showMenu, setShowMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchCourseSections();
  }, [pdfId]);

  // Refetch navigation when returning to screen
  useFocusEffect(
    React.useCallback(() => {
      refetchNavigation();
    }, [])
  );

  const fetchCourseSections = async () => {
    try {
      setLoading(true);
      setError(null);

      const moduleDetail = await moduleService.getModuleDetail(
        courseId,
        userId
      );

      // Find the current PDF in the sections
      let foundPDF: any = null;
      let foundSection: any = null;

      for (const section of moduleDetail.sections) {
        if (section.items) {
          const pdf = section.items.find(
            (item: ModuleItem) => item.id === pdfId && item.type === "pdf"
          );
          if (pdf) {
            foundPDF = pdf;
            foundSection = section;
            break;
          }
        }
      }
      console.log("FOUNDPDF:", foundPDF);
      if (foundPDF && foundSection) {
        // Construct PDF detail from module data
        setPdfDetail({
          id: foundPDF.id,
          title: foundPDF.title,
          description: foundPDF.description || "",
          pdf_url: foundPDF.pdf_url,
          thumbnail_url: foundPDF.thumbnail_url,
          course: {
            id: courseId,
            title: moduleDetail.course.title,
          },
          section: {
            id: foundSection.id,
            title: foundSection.title,
          },
          userProgress: {
            is_completed: foundPDF.is_completed || false,
          },
        });
        setIsCompleted(foundPDF.is_completed || false);

        console.log("📄 PDF loaded:", {
          id: foundPDF.id,
          title: foundPDF.title,
          isCompleted: foundPDF.is_completed || false,
        });
      } else {
        throw new Error("PDF not found in course modules");
      }
    } catch (err: any) {
      console.error("Error fetching course sections:", err);
      setError(err.message || "Failed to load PDF");
      Alert.alert(
        "Error",
        err.message || "Failed to load PDF",
        [
          {
            text: "Go Back",
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!userId || !pdfId) {
      Alert.alert("Error", "Missing user or PDF information");
      return;
    }

    try {
      setMarkingComplete(true);

      console.log("🔄 Marking PDF as completed...");

      const result = await pdfService.markCompleted(courseId, {
        userId,
        pdfId,
        isCompleted: true,
      });

      console.log("✅ PDF marked as completed:", {
        pdfId,
        courseProgress: result.courseProgress?.progress_percentage,
        moduleCompleted: result.moduleProgress?.is_completed,
      });

      // Update local state immediately
      setIsCompleted(true);

      // Update pdfDetail to reflect completion
      if (pdfDetail) {
        setPdfDetail({
          ...pdfDetail,
          userProgress: {
            ...pdfDetail.userProgress,
            is_completed: true,
            completed_at: new Date().toISOString(),
          },
        });
      }

      // Refetch navigation to update next/previous items
      await refetchNavigation();

      // **NEW: Update navigation params to trigger refresh in ModuleDetail**
      navigation.setParams({
        pdfCompleted: true,
        completedPdfId: pdfId,
        timestamp: Date.now(), // Add timestamp to force detection
      } as any);

      Alert.alert("Success", "Lesson marked as completed!", [{ text: "OK" }]);
    } catch (error: any) {
      console.error("Error marking PDF as completed:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update completion status"
      );
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleNext = () => {
    // Check if the current PDF is completed before allowing navigation
    if (!isCompleted) {
      Alert.alert(
        "Complete This Lesson",
        "Please mark this lesson as completed before proceeding to the next item.",
        [{ text: "OK" }]
      );
      return;
    }

    if (nextItemInModule) {
      // Navigate with completion state to trigger refresh
      if (nextItemInModule.item.type === "video") {
        navigation.navigate("LessonPlayer", {
          videoId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
          // NEW: Pass state to indicate previous item completed
          fromPdfId: pdfId,
          pdfCompleted: true,
        } as any);
      } else if (nextItemInModule.item.type === "quiz") {
        navigation.navigate("QuizScreen", {
          quizId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
          fromPdfId: pdfId,
          pdfCompleted: true,
        } as any);
      } else if (nextItemInModule.item.type === "pdf") {
        navigation.replace("PDFView", {
          pdfId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
          fromPdfId: pdfId,
          pdfCompleted: true,
        } as any);
      }
    }
  };

  const handlePrevious = () => {
    if (prevItemInModule) {
      if (prevItemInModule.item.type === "video") {
        navigation.navigate("LessonPlayer", {
          videoId: prevItemInModule.item.id,
          courseId,
          sectionId: prevItemInModule.sectionId,
          userId,
        });
      } else if (prevItemInModule.item.type === "quiz") {
        navigation.navigate("QuizScreen", {
          quizId: prevItemInModule.item.id,
          courseId,
          sectionId: prevItemInModule.sectionId,
          userId,
        });
      } else if (prevItemInModule.item.type === "pdf") {
        navigation.replace("PDFView", {
          pdfId: prevItemInModule.item.id,
          courseId,
          sectionId: prevItemInModule.sectionId,
          userId,
        });
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfDetail?.pdf_url) {
      Alert.alert("Error", "PDF URL not available");
      return;
    }

    try {
      setDownloading(true);
      setShowMenu(false);

      const filename = `${pdfDetail.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadResumable = FileSystem.createDownloadResumable(
        pdfDetail.pdf_url,
        fileUri
      );

      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
          await Sharing.shareAsync(result.uri, {
            mimeType: "application/pdf",
            dialogTitle: "Save PDF",
            UTI: "com.adobe.pdf",
          });
          Alert.alert("Success", "PDF ready to save!");
        } else {
          Alert.alert("Downloaded", `PDF saved to: ${result.uri}`, [
            { text: "OK" },
          ]);
        }
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      Alert.alert(
        "Download Error",
        "Failed to download PDF. Please try opening it in your browser instead.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open in Browser",
            onPress: () => Linking.openURL(pdfDetail.pdf_url),
          },
        ]
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePDFError = () => {
    setPdfLoadError(true);
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setPdfLoadError(false);
      }, 2000);
    }
  };

  const handleManualRetry = () => {
    setRetryCount((prev) => prev + 1);
    setPdfLoadError(false);
  };

  if (loading) {
    return (
      <Screen
        title="Loading..."
        navigation={navigation}
        headerLeftIcon="chevron-back"
        customEdges={["top", "bottom"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple400} />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !pdfDetail) {
    return (
      <Screen
        title="Error"
        navigation={navigation}
        headerLeftIcon="chevron-back"
        customEdges={["top", "bottom"]}
      >
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.errorText}>{error || "PDF not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchCourseSections}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={pdfDetail.course.title}
      subtitle={pdfDetail.section.title}
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => {
        // Pass completion state when navigating back
        navigation.navigate("ModuleDetail", {
          courseId,
          sectionId,
          userId,
          pdfCompleted: isCompleted,
          completedPdfId: isCompleted ? pdfId : undefined,
          timestamp: Date.now(), // Force refresh detection
        } as any);
      }}
    >
      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {pdfDetail.pdf_url ? (
          <>
            {pdfLoadError ? (
              <View style={styles.errorOverlay}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={Colors.textSecondary}
                />
                <Text style={styles.errorOverlayText}>
                  Failed to load PDF viewer
                </Text>
                <TouchableOpacity
                  style={styles.retryButtonSmall}
                  onPress={handleManualRetry}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.retryButtonSmall, styles.secondaryButton]}
                  onPress={() => Linking.openURL(pdfDetail.pdf_url)}
                >
                  <Text style={styles.secondaryButtonText}>
                    Open in Browser
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <WebView
                key={retryCount}
                source={{
                  uri: `https://docs.google.com/viewer?url=${encodeURIComponent(
                    pdfDetail.pdf_url
                  )}&embedded=true`,
                }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color={Colors.purple400} />
                    <Text style={styles.loadingText}>Loading PDF...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error("WebView error:", nativeEvent);
                  handlePDFError();
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error("HTTP error:", nativeEvent.statusCode);
                  handlePDFError();
                }}
              />
            )}

            {/* Action Buttons Overlay */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => Linking.openURL(pdfDetail.pdf_url)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="open-outline"
                  size={20}
                  color={Colors.purple400}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowMenu(!showMenu)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={Colors.purple400}
                />
              </TouchableOpacity>
            </View>

            {/* Dropdown Menu */}
            {showMenu && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDownloadPDF}
                  disabled={downloading}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color={Colors.purple400} />
                  ) : (
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color={Colors.textPrimary}
                    />
                  )}
                  <Text style={styles.menuItemText}>
                    {downloading ? "Downloading..." : "Download PDF"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    Linking.openURL(pdfDetail.pdf_url);
                  }}
                >
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={Colors.textPrimary}
                  />
                  <Text style={styles.menuItemText}>Open in Browser</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons
              name="newspaper-outline"
              size={64}
              color={Colors.textSecondary}
            />
            <Text style={styles.placeholderText}>No PDF available</Text>
          </View>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        {isCompleted && (
          <View style={styles.completionBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
            <Text style={styles.completionText}>Completed</Text>
          </View>
        )}
        <Text style={styles.title}>{pdfDetail.title}</Text>
      </View>

      <ActionButton
        onPress={handleMarkAsCompleted}
        text="Mark as Completed"
        loading={markingComplete}
        disabled={markingComplete || isCompleted}
        style={isCompleted ? { display: "none" } : undefined}
      />

      {/* Show completion message when completed */}
      {isCompleted && (
        <View style={styles.completedMessageContainer}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.green} />
          <Text style={styles.completedMessage}>
            You've completed this lesson!
          </Text>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            !prevItemInModule && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={!prevItemInModule}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={prevItemInModule ? Colors.purple400 : Colors.textSecondary}
          />
          <View style={styles.navButtonContent}>
            <Text
              style={[
                styles.navLabel,
                !prevItemInModule && styles.navLabelDisabled,
              ]}
            >
              {prevItemInModule?.item.type === "quiz"
                ? "PREVIOUS QUIZ"
                : prevItemInModule?.item.type === "video"
                ? "PREVIOUS LESSON"
                : "PREVIOUS PDF"}
            </Text>
            {prevItemInModule ? (
              <Text style={styles.navButtonText} numberOfLines={2}>
                {prevItemInModule.item.title}
              </Text>
            ) : (
              <Text style={styles.navButtonTextDisabled}>No previous item</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            (!nextItemInModule || (nextItemInModule && !isCompleted)) &&
              styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!nextItemInModule || !isCompleted}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Text
              style={[
                styles.navLabel,
                styles.navLabelRight,
                (!nextItemInModule || (nextItemInModule && !isCompleted)) &&
                  styles.navLabelDisabled,
              ]}
            >
              {nextItemInModule?.item.type === "quiz"
                ? "NEXT QUIZ"
                : nextItemInModule?.item.type === "video"
                ? "NEXT LESSON"
                : "NEXT PDF"}
            </Text>
            {nextItemInModule ? (
              <>
                <Text
                  style={[
                    styles.navButtonText,
                    styles.navButtonTextRight,
                    !isCompleted && styles.navButtonTextDisabled,
                  ]}
                  numberOfLines={2}
                >
                  {nextItemInModule.item.title}
                </Text>
                {!isCompleted && (
                  <Text style={styles.lockedText}>
                    🔒 Complete current lesson first
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
                No next item
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              nextItemInModule && isCompleted
                ? Colors.purple400
                : Colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>

      {/* Course Completion Message */}
      {isLastItem && isCompleted && (
        <CourseCompletionCard
          courseId={courseId}
          navigation={navigation}
          onBackToCourse={() => {
            navigation.navigate("CourseDetail", {
              courseId,
              pdfCompleted: true,
              pdfId,
            } as any);
          }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.purple400,
    borderRadius: 8,
  },
  retryButtonSmall: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.purple400,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: Colors.textInputBg,
    borderWidth: 1,
    borderColor: Colors.purple400,
  },
  secondaryButtonText: {
    color: Colors.purple400,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
  },
  pdfContainer: {
    height: SCREEN_HEIGHT * 0.65, // 65% of screen height
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: Spacing.md,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.textInputBg,
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.textInputBg,
  },
  errorOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.textInputBg,
    padding: Spacing.xl,
  },
  errorOverlayText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
    textAlign: "center",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  actionButtonsContainer: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  iconButton: {
    backgroundColor: Colors.white,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownMenu: {
    position: "absolute",
    top: 48,
    right: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 180,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.textInputBg,
  },
  infoCard: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 12,
  },
  completionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.green + "20",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  completionText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  navigationContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
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
    lineHeight: 18,
  },
  navButtonTextRight: {
    textAlign: "right",
  },
  navButtonTextDisabled: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  lockedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "right",
    fontStyle: "italic",
  },
  completedMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.green + "15",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  completedMessage: {
    fontSize: 15,
    color: Colors.green,
    fontWeight: "600",
  },
});

export default PDFView;
