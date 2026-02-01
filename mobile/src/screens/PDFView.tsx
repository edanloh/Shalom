// ENHANCED: Automated PDFView Screen with intelligent viewer fallback
// Automatically cycles through viewers until one works successfully
// No manual dropdown needed - fully automated detection

import React, { useState, useEffect, useRef } from "react";
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
import type { ModuleItem } from "@/services/moduleService";

type PDFViewNavigationProp = StackNavigationProp<MainStackParamList, "PDFView">;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// PDF Viewer fallback options - ordered by reliability
const PDF_VIEWERS = [
  {
    name: "Direct PDF",
    getUrl: (pdfUrl: string) => pdfUrl,
    description: "Native viewer",
    timeout: 8000, // 8 seconds
  },
  {
    name: "Mozilla PDF.js",
    getUrl: (pdfUrl: string) =>
      `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`,
    description: "Open-source viewer",
    timeout: 10000, // 10 seconds
  },
  {
    name: "Google Drive Viewer",
    getUrl: (pdfUrl: string) =>
      `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(pdfUrl)}`,
    description: "Google viewer",
    timeout: 10000,
  },
  {
    name: "Office Online",
    getUrl: (pdfUrl: string) =>
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pdfUrl)}`,
    description: "Microsoft viewer",
    timeout: 12000,
  },
  {
    name: "PDF.js CDN",
    getUrl: (pdfUrl: string) =>
      `https://cdnjs.cloudflare.com/ajax/libs/pdfjs-dist/3.11.174/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`,
    description: "CDN-hosted viewer",
    timeout: 10000,
  },
];

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
  
  // Automated PDF viewer state
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const [viewerAttempts, setViewerAttempts] = useState<number[]>([]);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [isLoadingViewer, setIsLoadingViewer] = useState(true);
  const [successfulViewer, setSuccessfulViewer] = useState<number | null>(null);
  const webViewRef = useRef<any>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCourseSections();
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (errorCheckTimeoutRef.current) {
        clearTimeout(errorCheckTimeoutRef.current);
      }
    };
  }, [pdfId]);

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

      if (foundPDF && foundSection) {
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

  // Clear all timeouts
  const clearAllTimeouts = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (errorCheckTimeoutRef.current) {
      clearTimeout(errorCheckTimeoutRef.current);
      errorCheckTimeoutRef.current = null;
    }
  };

  // Automatically try next viewer on error
  const handlePDFError = () => {
    console.log(`❌ PDF Viewer error with ${PDF_VIEWERS[currentViewerIndex].name}`);
    
    clearAllTimeouts();
    
    // Record this attempt
    setViewerAttempts((prev) => [...prev, currentViewerIndex]);

    // Auto-advance to next viewer
    if (currentViewerIndex < PDF_VIEWERS.length - 1) {
      const nextIndex = currentViewerIndex + 1;
      console.log(`🔄 Auto-switching to ${PDF_VIEWERS[nextIndex].name}...`);
      setCurrentViewerIndex(nextIndex);
      setIsLoadingViewer(true);
      setPdfLoadError(false);
    } else {
      // All viewers failed
      console.log("💥 All PDF viewers failed");
      setIsLoadingViewer(false);
      setPdfLoadError(true);
    }
  };

  // Handle successful load
  const handlePDFLoadSuccess = () => {
    console.log(`✅ PDF loaded successfully with ${PDF_VIEWERS[currentViewerIndex].name}`);
    clearAllTimeouts();
    setSuccessfulViewer(currentViewerIndex);
    setIsLoadingViewer(false);
    setPdfLoadError(false);
  };

  // Start load timeout when viewer changes
  useEffect(() => {
    if (pdfDetail?.pdf_url && !successfulViewer && currentViewerIndex < PDF_VIEWERS.length) {
      clearAllTimeouts();
      
      const currentViewer = PDF_VIEWERS[currentViewerIndex];
      console.log(`⏱️ Starting ${currentViewer.timeout}ms timeout for ${currentViewer.name}`);
      
      // Set timeout for this viewer
      loadTimeoutRef.current = setTimeout(() => {
        if (isLoadingViewer) {
          console.log(`⏰ Timeout reached for ${currentViewer.name}, trying next viewer...`);
          handlePDFError();
        }
      }, currentViewer.timeout);
    }
    
    return () => clearAllTimeouts();
  }, [currentViewerIndex, pdfDetail?.pdf_url]);

  // Handle WebView load events
  const handleWebViewLoad = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.log('📱 WebView loaded:', nativeEvent.url);
    
    // Check for error indicators in the page
    const hasError = 
      nativeEvent.title?.toLowerCase().includes('error') || 
      nativeEvent.title?.toLowerCase().includes('not available') ||
      nativeEvent.title?.toLowerCase().includes('failed') ||
      nativeEvent.url?.includes('error');
    
    if (hasError) {
      console.log('🚫 Detected error page');
      handlePDFError();
    } else {
      // Give it a moment to fully render, then check via injected JS
      errorCheckTimeoutRef.current = setTimeout(() => {
        // The injected JS will handle the final check
      }, 2000);
    }
  };

  const handleWebViewLoadEnd = () => {
    // Only mark as success if we haven't detected errors
    if (!viewerAttempts.includes(currentViewerIndex)) {
      // Will be confirmed by injected JavaScript check
    }
  };

  const handleManualRetry = () => {
    console.log("🔄 Manual retry requested - resetting all viewers");
    clearAllTimeouts();
    setCurrentViewerIndex(0);
    setViewerAttempts([]);
    setPdfLoadError(false);
    setIsLoadingViewer(true);
    setSuccessfulViewer(null);
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

      setIsCompleted(true);

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

      await refetchNavigation();

      navigation.setParams({
        pdfCompleted: true,
        completedPdfId: pdfId,
        timestamp: Date.now(),
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
    if (!isCompleted) {
      Alert.alert(
        "Complete This Lesson",
        "Please mark this lesson as completed before proceeding to the next item.",
        [{ text: "OK" }]
      );
      return;
    }

    if (nextItemInModule) {
      if (nextItemInModule.item.type === "video") {
        navigation.replace("LessonPlayer", {
          videoId: nextItemInModule.item.id,
          courseId,
          sectionId: nextItemInModule.sectionId,
          userId,
          fromPdfId: pdfId,
          pdfCompleted: true,
        } as any);
      } else if (nextItemInModule.item.type === "quiz") {
        navigation.replace("QuizScreen", {
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
        navigation.replace("LessonPlayer", {
          videoId: prevItemInModule.item.id,
          courseId,
          sectionId: prevItemInModule.sectionId,
          userId,
        });
      } else if (prevItemInModule.item.type === "quiz") {
        navigation.replace("QuizScreen", {
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
      const baseDir =
        (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
      if (!baseDir) {
        throw new Error("File system directory unavailable");
      }
      const fileUri = baseDir + filename;

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
            color={Colors.purple400}
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

  const currentViewer = PDF_VIEWERS[currentViewerIndex];
  const pdfUrl = currentViewer.getUrl(pdfDetail.pdf_url);

  return (
    <Screen
      title={pdfDetail.course.title}
      subtitle={pdfDetail.section.title}
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate("ModuleDetail", {
          courseId,
          sectionId,
          userId,
        } as any);
      }}
    >
      {/* PDF Viewer */}
      <View style={styles.pdfContainer}>
        {pdfDetail.pdf_url ? (
          <>
            {/* Automated Status Bar - only shows when trying different viewers */}
            {isLoadingViewer && successfulViewer === null && (
              <View style={styles.autoStatusBar}>
                <ActivityIndicator size="small" color={Colors.purple400} />
                <Text style={styles.autoStatusText}>
                  Loading with {currentViewer.name}
                  {viewerAttempts.length > 0 && ` (${currentViewerIndex + 1}/${PDF_VIEWERS.length})`}
                </Text>
              </View>
            )}

            {/* Success indicator - shows briefly then fades */}
            {successfulViewer !== null && (
              <View style={styles.successBar}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                <Text style={styles.successText}>
                  Loaded with {PDF_VIEWERS[successfulViewer].name}
                </Text>
              </View>
            )}

            {pdfLoadError ? (
              <View style={styles.errorOverlay}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={Colors.purple400}
                />
                <Text style={styles.errorOverlayText}>
                  Unable to load PDF
                </Text>
                <Text style={styles.errorSubtext}>
                  Tried {viewerAttempts.length} different viewer{viewerAttempts.length !== 1 ? 's' : ''}
                </Text>
                
                <View style={styles.errorActions}>
                  <TouchableOpacity
                    style={styles.retryButtonSmall}
                    onPress={handleManualRetry}
                  >
                    <Ionicons name="refresh" size={16} color={Colors.purple400} />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.retryButtonSmall, styles.secondaryButton]}
                    onPress={handleDownloadPDF}
                  >
                    <Ionicons name="download" size={16} color={Colors.purple400} />
                    <Text style={styles.secondaryButtonText}>Download</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.retryButtonSmall, styles.secondaryButton]}
                    onPress={() => Linking.openURL(pdfDetail.pdf_url)}
                  >
                    <Ionicons name="open-outline" size={16} color={Colors.purple400} />
                    <Text style={styles.secondaryButtonText}>Open in Browser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <WebView
                ref={webViewRef}
                key={`${currentViewerIndex}-${pdfDetail.id}`}
                source={{ uri: pdfUrl }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color={Colors.purple400} />
                    <Text style={styles.loadingText}>
                      Loading PDF...
                    </Text>
                    {viewerAttempts.length > 0 && (
                      <Text style={styles.attemptTextLoading}>
                        Trying alternative viewer {currentViewerIndex + 1}/{PDF_VIEWERS.length}
                      </Text>
                    )}
                  </View>
                )}
                onLoad={handleWebViewLoad}
                onLoadEnd={handleWebViewLoadEnd}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error("WebView error:", nativeEvent);
                  handlePDFError();
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error("HTTP error:", nativeEvent.statusCode);
                  if (nativeEvent.statusCode >= 400) {
                    handlePDFError();
                  }
                }}
                // Intelligent error detection via JavaScript
                injectedJavaScript={`
                  (function() {
                    // Multi-stage error detection
                    let checkCount = 0;
                    const maxChecks = 3;
                    
                    function checkForErrors() {
                      checkCount++;
                      
                      try {
                        const bodyText = document.body.innerText.toLowerCase();
                        const hasError = 
                          bodyText.includes('no preview available') || 
                          bodyText.includes('error') ||
                          bodyText.includes('cannot display') ||
                          bodyText.includes('failed to load') ||
                          bodyText.includes('unable to load') ||
                          bodyText.includes('not supported') ||
                          bodyText.includes('try again') ||
                          document.querySelector('.error') !== null ||
                          document.querySelector('[class*="error"]') !== null;
                        
                        if (hasError) {
                          window.ReactNativeWebView.postMessage('PDF_LOAD_FAILED');
                          return;
                        }
                        
                        // Check for successful PDF indicators
                        const hasSuccess = 
                          document.querySelector('canvas') !== null ||
                          document.querySelector('embed') !== null ||
                          document.querySelector('object[type="application/pdf"]') !== null ||
                          document.querySelector('#viewer') !== null ||
                          bodyText.length > 100; // Has substantial content
                        
                        if (hasSuccess && checkCount >= 2) {
                          window.ReactNativeWebView.postMessage('PDF_LOAD_SUCCESS');
                        } else if (checkCount < maxChecks) {
                          setTimeout(checkForErrors, 2000);
                        }
                      } catch (e) {
                        // If we can't check, assume it might be loading
                        if (checkCount < maxChecks) {
                          setTimeout(checkForErrors, 2000);
                        }
                      }
                    }
                    
                    // Start checking after initial load
                    setTimeout(checkForErrors, 1500);
                  })();
                  true;
                `}
                onMessage={(event) => {
                  if (event.nativeEvent.data === 'PDF_LOAD_FAILED') {
                    console.log('🚨 JavaScript detected load failure');
                    handlePDFError();
                  } else if (event.nativeEvent.data === 'PDF_LOAD_SUCCESS') {
                    console.log('✅ JavaScript confirmed successful load');
                    handlePDFLoadSuccess();
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scalesPageToFit={Platform.OS === 'android'}
                bounces={false}
                onLoadProgress={({ nativeEvent }) => {
                  if (nativeEvent.progress === 1) {
                    // WebView reports full load
                    // But we still wait for JS confirmation
                  }
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
                      color={Colors.purple400}
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
                    color={Colors.purple400}
                  />
                  <Text style={styles.menuItemText}>Open in Browser</Text>
                </TouchableOpacity>

                {successfulViewer === null && !pdfLoadError && (
                  <>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        handleManualRetry();
                      }}
                    >
                      <Ionicons
                        name="refresh"
                        size={20}
                        color={Colors.textPrimary}
                      />
                      <Text style={styles.menuItemText}>Restart Viewer</Text>
                    </TouchableOpacity>
                  </>
                )}
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
  errorSubtext: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    color: Colors.textSecondary,
    fontSize: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.purple400,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: Colors.gray800,
    borderWidth: 1,
    borderColor: Colors.purple400,
  },
  secondaryButtonText: {
    color: Colors.purple400,
    fontSize: 13,
    fontWeight: "600",
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  pdfContainer: {
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: Spacing.md,
  },
  autoStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.purple400 + "15",
    borderBottomWidth: 1,
    borderBottomColor: Colors.purple400 + "30",
  },
  autoStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.purple400,
  },
  successBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.green + "15",
    borderBottomWidth: 1,
    borderBottomColor: Colors.green + "30",
  },
  successText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.green,
  },
  attemptTextLoading: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
    color: Colors.textSecondary,
    fontSize: TextStyles.body.fontSize,
    textAlign: "center",
    fontWeight: "600",
  },
  errorActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    justifyContent: "center",
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
    zIndex: 5,
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
    zIndex: 10,
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
    color: Colors.purple400,
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