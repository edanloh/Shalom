import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, TextStyles } from "@/constants";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MainStackParamList } from "@/types/navigation";
import Screen from "@/components/common/Screen";
import ActionButton from "@/components/ActionButton";
import { pdfService } from "@/services/pdfService";

type PDFViewNavigationProp = StackNavigationProp<MainStackParamList, "PDFView">;

const PDFView = () => {
  const route = useRoute();
  const navigation = useNavigation<PDFViewNavigationProp>();
  const { pdfId, courseId, sectionId, userId } = route.params as any;

  const [loading, setLoading] = useState(true);
  const [pdfDetail, setPdfDetail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    fetchPDFDetail();
  }, [pdfId]);

  const fetchPDFDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Implement PDF detail fetching
      // const data = await pdfService.getPDFDetail(courseId, pdfId, userId);
      // setPdfDetail(data);

      // Mock data for now
      setPdfDetail({
        title: "Sample PDF Document",
        pdf_url:
          "https://www.ntu.edu.sg/docs/default-source/undergraduate-admissions/prospectus/ug-eprospectus.pdf?sfvrsn=be74cce7_2",
        course: { title: "Course Title" },
        section: { title: "Section Title" },
        description: "This is a PDF document description.",
        navigation: {
          previousPDF: null,
          nextPDF: null,
        },
        userProgress: {
          is_completed: false,
        },
      });

      // Set initial completion status
      setIsCompleted(false);
    } catch (err: any) {
      console.error("Error fetching PDF detail:", err);
      setError(err.message || "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (pdfDetail?.navigation.nextPDF) {
      navigation.replace("PDFView", {
        pdfId: pdfDetail.navigation.nextPDF.id,
        courseId,
        sectionId,
        userId,
      });
    }
  };

  const handlePrevious = () => {
    if (pdfDetail?.navigation.previousPDF) {
      navigation.replace("PDFView", {
        pdfId: pdfDetail.navigation.previousPDF.id,
        courseId,
        sectionId,
        userId,
      });
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!userId || !pdfId) {
      Alert.alert("Error", "Missing user or PDF information");
      return;
    }

    try {
      setMarkingComplete(true);

      const newCompletedStatus = !isCompleted;

      await pdfService.markCompleted(courseId, {
        userId,
        pdfId,
        isCompleted: newCompletedStatus,
      });

      setIsCompleted(newCompletedStatus);

      Alert.alert(
        "Success",
        newCompletedStatus
          ? "Lesson marked as completed!"
          : "Lesson marked as incomplete"
      );
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchPDFDetail}>
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
    >
      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        <Ionicons
          name="newspaper-outline"
          size={64}
          color={Colors.textSecondary}
        />
        <Text style={styles.placeholderText}>PDF Document</Text>
        {pdfDetail.pdf_url && (
            <ActionButton
              onPress={() => Linking.openURL(pdfDetail.pdf_url)}
              text="Open PDF"
              variant="primary"
            />
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.title}>{pdfDetail.title}</Text>

        {isCompleted && (
          <View style={styles.completionBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
            <Text style={styles.completionText}>Completed</Text>
          </View>
        )}

        {pdfDetail.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this document</Text>
            <Text style={styles.descriptionText}>{pdfDetail.description}</Text>
          </View>
        )}
      </View>

      <ActionButton
        onPress={handleMarkAsCompleted}
        text={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
        loading={markingComplete}
        disabled={markingComplete}
    />

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            !pdfDetail.navigation.previousPDF && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={!pdfDetail.navigation.previousPDF}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={
              pdfDetail.navigation.previousPDF
                ? Colors.purple400
                : Colors.textSecondary
            }
          />
          <View style={styles.navButtonContent}>
            <Text
              style={[
                styles.navLabel,
                !pdfDetail.navigation.previousPDF && styles.navLabelDisabled,
              ]}
            >
              PREVIOUS
            </Text>
            {pdfDetail.navigation.previousPDF ? (
              <Text style={styles.navButtonText} numberOfLines={2}>
                {pdfDetail.navigation.previousPDF.title}
              </Text>
            ) : (
              <Text style={styles.navButtonTextDisabled}>
                No previous document
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            !pdfDetail.navigation.nextPDF && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!pdfDetail.navigation.nextPDF}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Text
              style={[
                styles.navLabel,
                styles.navLabelRight,
                !pdfDetail.navigation.nextPDF && styles.navLabelDisabled,
              ]}
            >
              NEXT
            </Text>
            {pdfDetail.navigation.nextPDF ? (
              <Text
                style={[styles.navButtonText, styles.navButtonTextRight]}
                numberOfLines={2}
              >
                {pdfDetail.navigation.nextPDF.title}
              </Text>
            ) : (
              <Text
                style={[
                  styles.navButtonTextDisabled,
                  styles.navButtonTextRight,
                ]}
              >
                No next document
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              pdfDetail.navigation.nextPDF
                ? Colors.purple400
                : Colors.textSecondary
            }
          />
        </TouchableOpacity>
      </View>
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
  retryButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
  },
  pdfContainer: {
    height: 300,
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
  },
  infoCard: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.md,
    marginVertical: Spacing.lg,
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
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  descriptionContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray500,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  navigationContainer: {
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
});

export default PDFView;
