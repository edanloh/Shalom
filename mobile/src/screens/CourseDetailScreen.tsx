import React, { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import {
  View,
  Text,
  Alert,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography, TextStyles } from "../constants";
import { Images } from "../../assets";
import {
  courseDetailService,
  ProcessedCourseDetail,
  CourseModule,
} from "../services/courseDetailService";
import type { MainStackParamList } from "../types/navigation";
import { ImageWithFallback } from "../components/common";
import AnimatedHeartButton from "../components/common/AnimatedHeartButton";
import * as Haptics from "expo-haptics";
import { useAuth } from "../contexts/AuthContext";
import { useUser } from '../contexts/UserContext';
import { courseService } from "../services/courseService";
import creditService from "../services/creditService";
import {
  moduleService,
  ModuleDetailResponse,
  UserProgress,
  CourseSection,
} from "../services/moduleService";
import { useFocusEffect } from "@react-navigation/native";
import { useCourses } from "../contexts/CourseContext";
import Screen from "../components/common/Screen";
import ActionButton from "@/components/ActionButton";
import { showToast } from "@/components/common/Toast";
import notificationService from '@/services/notificationService';

const { width: screenWidth } = Dimensions.get("window");

type Props = StackScreenProps<MainStackParamList, "CourseDetail">;
type CourseContent = ModuleDetailResponse["data"];

export default function CourseDetailScreen({
  navigation,
  route,
}: StackScreenProps<MainStackParamList, "CourseDetail">) {
  const { courseId } = route.params;
  const [courseDetail, setCourseDetail] =
    useState<ProcessedCourseDetail | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const userId = user?.uuid;
  const fallbackUserId = process.env.EXPO_PUBLIC_DEFAULT_USER_ID;
  const effectiveUserId = userId || fallbackUserId;

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  
  // Wishlist functionality
  const { toggleWishlist, isWishlisted } = useCourses();
  const wishlisted = isWishlisted(courseId);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        loadCourseDetail();
          notificationService.getCourseNotifications(courseId).then(data => {
          // Group by notification ID to avoid duplicates
          console.log('[CourseDetailScreen] fetched notifications:', data);
          const uniqueNotifications = Array.from(new Map(data.map(item => [item.type, item])).values());
          setNotifications(uniqueNotifications);
        }).catch(err => {
          console.error('Error fetching notifications:', err);
        });
      }
    }, [courseId, userId])
  );

  useEffect(() => {
    (async () => {
      if (!effectiveUserId) return;
      try {
        const enrolled = await courseService.isUserEnrolledInCourse(
          effectiveUserId,
          courseId,
        );
        setIsEnrolled(enrolled);
      } catch (e) {
        console.log("Enroll status check failed:", e);
      }
    })();
  }, [courseId, effectiveUserId]);

  const calculateCourseProgress = (): number => {
    if (!courseContent || !courseContent.sections) return 0;

    const totalModules = courseContent.sections.length;
    if (totalModules === 0) return 0;

    // Count only modules that are marked as completed
    const completedModules = courseContent.sections.filter((section) =>
      moduleService.isSectionCompleted(section, courseContent.userProgress),
    ).length;

    // console.log("[CourseDetailScreen] Progress calculation:", {
    //   completedModules,
    //   totalModules,
    //   percentage: Math.round((completedModules / totalModules) * 100),
    // });

    return Math.round((completedModules / totalModules) * 100);
  };

  const getCompletedModulesCount = (): number => {
    if (!courseContent) return 0;
    return courseContent.sections.filter((section) =>
      moduleService.isSectionCompleted(section, courseContent.userProgress),
    ).length;
  };

  const loadCourseDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both course detail and module detail with user progress
      const [detail, moduleData] = await Promise.all([
        courseDetailService.getCourseDetail(courseId),
        moduleService.getModuleDetail(courseId, effectiveUserId),
      ]);
      console.log("[CourseDetailScreen] Loaded course detail and content:", {
        detail,
        moduleData,
      });
      setCourseDetail(detail);
      setCourseContent(moduleData);
    } catch (err) {
      console.error("Failed to load course detail:", err);
      setError("Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={16} color="#FFD700" />,
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={16} color="#FFD700" />,
        );
      }
    }
    return stars;
  };

  const renderRatingBreakdown = (breakdown: Record<number, number>) => {
    const totalReviews = Object.values(breakdown).reduce(
      (sum, count) => sum + count,
      0,
    );

    return (
      <View style={styles.ratingBreakdown}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star] || 0;
          const percentage =
            totalReviews > 0 ? (count / totalReviews) * 100 : 0;

          return (
            <View key={star} style={styles.ratingRow}>
              <Text style={styles.starNumber}>{star}</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[styles.ratingBarFill, { width: `${percentage}%` }]}
                />
              </View>
              <Text style={styles.ratingPercentage}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderModule = (section: CourseSection, index: number) => {
    const isCompleted = moduleService.isSectionCompleted(
      section,
      courseContent?.userProgress,
    );
    const completedAt = section?.module_completed_at;

    // Module is locked if it's not the first module and previous module is not completed
    const isLocked =
      index > 0 &&
      courseContent &&
      !moduleService.isSectionCompleted(
        courseContent.sections[index - 1],
        courseContent.userProgress,
      );

    const onOpen = () => {
      if (!isEnrolled) {
        Alert.alert(
          "Enrollment required",
          "Please enroll to access lessons and quizzes.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Enroll now", onPress: handleEnroll },
          ],
        );
        return;
      }

      // Check if this is not the first module and the previous module is not completed
      if (index > 0 && courseContent) {
        const previousModule = courseContent.sections[index - 1];
        if (
          previousModule &&
          !moduleService.isSectionCompleted(
            previousModule,
            courseContent.userProgress,
          )
        ) {
          const previousModuleTitle =
            previousModule?.title || "the previous module";
          Alert.alert(
            "Complete Previous Module First",
            `Please complete "${previousModuleTitle}" before moving to this module.`,
            [{ text: "OK", style: "default" }],
          );
          return;
        }
      }

      navigation.navigate("ModuleDetail", {
        courseId: route.params.courseId,
        sectionId: section.id,
        userId: userId ?? "",
      });
    };

    return (
      <Pressable
        key={String(section.id ?? `section-${index}-${section.title ?? "module"}`)}
        style={[styles.moduleItem, isLocked && styles.moduleItemLocked]}
        onPress={isLocked ? undefined : onOpen}
        disabled={isLocked}
      >
        <View style={[styles.moduleIcon]}>
          <Ionicons name="book-outline" size={20} color={Colors.purple400} />
        </View>
        <View style={styles.moduleContent}>
          <View style={styles.moduleTitleRow}>
            <Text
              style={[styles.moduleTitle, isLocked && styles.moduleTextLocked]}
            >
              {section.title}
            </Text>
          </View>
          {!!section.description && (
            <Text
              style={[
                styles.moduleDescription,
                isLocked && styles.moduleTextLocked,
              ]}
            >
              {section.description}
            </Text>
          )}
          {isCompleted && completedAt && (
            <Text style={styles.completedDate}>
              Completed on {new Date(completedAt).toLocaleDateString()}
            </Text>
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
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
          {isLocked && (
            <View style={styles.lockedBadge}>
              <Ionicons
                name="lock-closed"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.lockedBadgeText}>Locked</Text>
            </View>
          )}
        </View>

        <View style={styles.moduleRightSection}>
          <Ionicons
            name={isLocked ? "lock-closed" : "chevron-forward"}
            size={20}
            color={isLocked ? Colors.textSecondary : Colors.textSecondary}
          />
        </View>
      </Pressable>
    );
  };

  const renderReview = (review: ProcessedCourseDetail["reviews"][0]) => (
    <View
      key={`${review.reviewerName}-${review.createdAt}`}
      style={styles.reviewItem}
    >
      <View style={styles.reviewHeader}>
        <ImageWithFallback
          source={{ uri: review.reviewerAvatar }}
          fallback={Images.defaultAvatar}
          style={styles.reviewerAvatar}
        />
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewNameRow}>
            <Text style={styles.reviewerName}>{review.reviewerName}</Text>
            {review.isPinned ? (
              <View style={styles.reviewPinnedBadge}>
                <Ionicons name="pin-outline" size={10} color={Colors.purple400} />
                <Text style={styles.reviewPinnedText}>Pinned</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.reviewRating}>{renderStarRating(review.rating)}</View>
      <Text style={styles.reviewText}>{review.review}</Text>
      {review.instructorReply ? (
        <View style={styles.instructorReplyBox}>
          <View style={styles.instructorReplyHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.purple400} />
            <Text style={styles.instructorReplyTitle}>Instructor reply</Text>
            {review.acknowledgedAt && !review.instructorRepliedAt ? (
              <Text style={styles.instructorReplyMeta}>Acknowledged</Text>
            ) : null}
          </View>
          <Text style={styles.instructorReplyText}>{review.instructorReply}</Text>
          {review.instructorRepliedAt ? (
            <Text style={styles.instructorReplyMeta}>
              {new Date(review.instructorRepliedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const handleLeaveReview = () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to leave a review.");
      return;
    }

    // Check if user is enrolled
    if (!isEnrolled) {
      Alert.alert(
        "Enrollment Required",
        "You must enroll in this course before leaving a review.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enroll Now", onPress: handleEnroll },
        ],
      );
      return;
    }

    // Check if course is completed
    const courseProgress = calculateCourseProgress();
    if (courseProgress < 100) {
      Alert.alert(
        "Complete the Course First",
        "You must complete all modules in this course before leaving a review.",
        [{ text: "OK", style: "default" }],
      );
      return;
    }

    navigation.navigate("LeaveReview", { courseId });
  };

  const handleEnroll = async () => {
    if (isEnrolling) return;
    if (!effectiveUserId) {
      Alert.alert("Sign in required", "Please sign in to enroll.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setIsEnrolling(true);
      const { firstModuleId } = await courseService.enrollInCourse(
        effectiveUserId,
        courseId,
      );

      // Mark as enrolled immediately so UI updates
      setIsEnrolled(true);
      // Refresh detail in background to pick up any progress/enrollment metadata
      loadCourseDetail?.();

      try {
        await creditService.recordCreditEvent({
          userId: effectiveUserId,
          type: "course_enrolled",
          title: courseDetail?.title || "Enrolled in course",
          points: 20,
          courseId,
        });
        showToast({
          title: "Enrolled",
          message: "Earned +20 credits for enrolling",
          type: "success",
        });
      } catch (err) {
        console.warn("Failed to record credit for enrollment", err);
        showToast({
          title: "Unable to record credits",
          message: "Something unexpected happened. Please try again later.",
          type: "error",
        });
      }

      // Update enrolled state and reload course data
      setIsEnrolled(true);

      // Reload course detail to fetch updated progress
      await loadCourseDetail();

      // Show success message
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Enrollment Successful!",
        "You have been successfully enrolled in this course. Start learning now!",
        [
          {
            text: "Start Learning",
            onPress: () => {
              if (firstModuleId && courseContent) {
                const firstSection = courseContent.sections[0];
                if (firstSection) {
                  navigation.navigate("ModuleDetail", {
                    courseId: courseId,
                    sectionId: firstSection.id,
                    userId: userId,
                  });
                }
              }
            },
          },
          { text: "OK", style: "cancel" },
        ],
      );
    } catch (e: any) {
      const status = e?.statusCode ?? e?.response?.status;
      console.log("[Enroll] error", {
        status,
        code: e?.code,
        msg: e?.message,
        details: e?.details,
      });
      Alert.alert(
        `Enrollment failed ${status ? `(${status})` : ""}`,
        e?.details?.message || e?.message || "Try again.",
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <Screen title="" noHeader customEdges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple400} />
          <Text style={styles.loadingText}>Loading course details...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !courseDetail) {
    return (
      <Screen title="" noHeader customEdges={["top", "bottom"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Course not found"}</Text>
          <Pressable style={styles.retryButton} onPress={loadCourseDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title=""
      noHeader
      widescreen
      // Include top inset so back button isn't under the notch
      customEdges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </Pressable>

        {/* Wishlist Button */}
        {courseDetail && (
          <AnimatedHeartButton
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleWishlist({
                id: courseDetail.id,
                title: courseDetail.title,
                description: courseDetail.description,
                image: courseDetail.image,
                instructor: courseDetail.instructor,
                rating: courseDetail.rating,
                duration: courseDetail.duration,
                category: courseDetail.category,
              } as any);
            }}
            style={styles.wishlistButton}
            filled={wishlisted}
            color={Colors.white}
            size={20}
          />
        )}
      </View>

      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <ImageWithFallback
          source={{ uri: courseDetail.image }}
          fallback={Images.placeholder}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Course Info */}
        <Text style={styles.courseTitle}>{courseDetail.title}</Text>

        {/* Category Badge */}
        <View
          style={[
            styles.catBadge,
            {
              backgroundColor:
                courseDetail.categoryColor || Colors.categoryDefault
            },
          ]}
        >
          <Text style={TextStyles.bodySmall}>{courseDetail.category}</Text>
        </View>

        <Text style={styles.courseOverview}>Overview</Text>
        <Text style={styles.courseDescription}>{courseDetail.description}</Text>

        {courseDetail.outcomes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Course Outcomes</Text>
            <View style={styles.outcomesList}>
              {courseDetail.outcomes.map((outcome, index) => (
                <View key={`${outcome}-${index}`} style={styles.outcomeItem}>
                  <View style={styles.outcomeBullet} />
                  <Text style={styles.outcomeText}>{outcome}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Course Progress Section */}
        {courseContent && courseContent.userProgress && (
          <>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Course Progress</Text>
                <Text style={styles.progressPercentage}>
                  {calculateCourseProgress()}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${calculateCourseProgress()}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.progressStats}>
                <Text style={styles.progressStatsText}>
                  {getCompletedModulesCount()} of{" "}
                  {courseContent?.sections.length || 0} modules completed
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Modules Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modules</Text>
          {courseContent &&
            getCompletedModulesCount() === courseContent.sections.length &&
            courseContent.sections.length > 0 && (
              <View style={styles.completedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.green}
                />
                <Text style={styles.completedBadgeText}>All Completed</Text>
              </View>
            )}
        </View>
        <View style={styles.modulesList}>
          {courseContent && courseContent.sections.length > 0 ? (
            courseContent.sections.map(renderModule)
          ) : (
            <View style={styles.noModulesContainer}>
              <Text style={styles.noModulesText}>No modules available</Text>
            </View>
          )}
        </View>

        {/* Instructor Section */}
        <Text style={styles.sectionTitle}>Instructor</Text>
        <View style={styles.instructorSection}>
          <ImageWithFallback
            source={{ uri: courseDetail.instructor.avatar }}
            fallback={Images.defaultAvatar}
            style={styles.instructorAvatar}
          />
          <View style={styles.instructorInfo}>
            <Text style={styles.instructorName}>
              {courseDetail.instructor.name}
            </Text>
            <Text style={styles.instructorRole}>Data Science Expert</Text>
          </View>
        </View>

        {/* Announcements Section */}
        <Text style={styles.sectionTitle}>Announcements</Text>
        <View style={{ marginBottom: 24 }}>
          {notifications && notifications.length > 0 ? (
            <>
              {notifications.slice(0, 3).map((notification, idx) => (
                <View
                  key={notification.id || idx}
                  style={{
                    backgroundColor: Colors.textInputBg,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  <Ionicons name="notifications" size={22} color={Colors.purple400} style={{ marginRight: 12, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.textPrimary, fontWeight: '600', marginBottom: 2 }}>
                      {notification.message}
                    </Text>
                    <Text style={{ color: Colors.textSecondary, marginBottom: 4 }}>
                      {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'N/A'}
                    </Text>
                  </View>
                </View>
              ))}
              {notifications.length > 3 && (
                <>
                  <Pressable
                    onPress={() => setShowAllAnnouncements(true)}
                    style={{ alignItems: 'center', paddingVertical: 6 }}
                  >
                    <Text style={{ color: Colors.purple200 }}>View All Announcements</Text>
                  </Pressable>
                  <Modal
                    visible={showAllAnnouncements}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setShowAllAnnouncements(false)}
                  >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                      <View style={{ backgroundColor: Colors.primary, borderRadius: 16, padding: 18, width: '90%', maxHeight: '80%' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 18, textAlign: 'center' }}>{`${notifications.length} Announcements`}</Text>
                        <ScrollView style={{ maxHeight: 400 }}>
                          {notifications.map((notification, idx) => (
                            <View
                              key={notification.id || idx}
                              style={{
                                backgroundColor: Colors.textInputBg,
                                borderRadius: 10,
                                padding: 14,
                                marginBottom: 10,
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                              }}
                            >
                              <Ionicons name="notifications" size={22} color={Colors.purple400} style={{ marginRight: 12, marginTop: 2 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: Colors.textPrimary, fontWeight: '600', marginBottom: 2 }}>
                                  {notification.message}
                                </Text>
                                <Text style={{ color: Colors.textSecondary, marginBottom: 4 }}>
                                  {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'N/A'}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                        <Pressable
                          onPress={() => setShowAllAnnouncements(false)}
                          style={{ alignItems: 'center', paddingTop: 8 }}
                        >
                          <Text style={{ color: Colors.purple400, fontWeight: '700', fontSize: 16 }}>Close</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Modal>
                </>
              )}
            </>
          ) : (
            <Text style={{ color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginVertical: 12 }}>
              No announcements yet
            </Text>
          )}
        </View>

        {/* Course Reviews */}
        <Text style={styles.sectionTitle}>Course Reviews</Text>

        {/* Rating Summary */}
        <View style={styles.reviewsSectionCard}>
          {/* Top row: Left summary (with button) + Right breakdown */}
          <View style={styles.reviewsTopRow}>
            {/* Left: summary + button */}
            <View style={styles.reviewsSummaryCol}>
              <Text style={styles.ratingNumber}>
                {courseDetail?.reviews?.length
                  ? courseDetail.rating.toFixed(1)
                  : "0.0"}
              </Text>
              <View style={styles.starsContainer}>
                {renderStarRating(
                  courseDetail?.reviews?.length ? courseDetail.rating : 0,
                )}
              </View>
              <Text style={styles.reviewCount}>
                {courseDetail?.reviews?.length || 0}{" "}
                {courseDetail?.reviews?.length === 1 ? "review" : "reviews"}
              </Text>

              {isEnrolled && calculateCourseProgress() === 100 && (
                <ActionButton
                  onPress={handleLeaveReview}
                  text={"Leave a Review"}
                  style={{
                    height: 42,
                    padding: 12,
                    paddingTop: 9,
                    marginTop: Spacing.md,
                    marginBottom: Spacing.xs,
                  }}
                />
              )}
            </View>

            {/* Right: rating breakdown */}
            {courseDetail?.ratingBreakdown &&
              renderRatingBreakdown(courseDetail.ratingBreakdown)}
          </View>

          {/* Divider */}
          {courseDetail?.reviews?.length ? (
            <View style={styles.reviewsDivider} />
          ) : null}

          {/* Reviews list or empty state */}
          <View style={styles.reviewsListTight}>
            {courseDetail?.reviews?.length ? (
              courseDetail.reviews.map(renderReview)
            ) : (
              <View style={styles.noReviewsContainer}>
                <Ionicons
                  name="star-outline"
                  size={48}
                  color={Colors.textSecondary}
                />
                <Text style={styles.noReviewsTitle}>No reviews yet</Text>
                <Text style={styles.noReviewsText}>
                  Be the first to share your experience with this course!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Enroll Button */}
        {!isEnrolled && (
          <ActionButton
            onPress={handleEnroll}
            text={"Enroll Now"}
            disabled={isEnrolling}
            loading={isEnrolling}
          />
        )}
      </View>
    </Screen>
  );
}

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
    color: Colors.red,
    fontSize: TextStyles.body.fontSize,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
  },
  header: {
    position: "absolute",
    top: Spacing.lg,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    position: "relative",
    height: 250,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  catBadge: {
    width: "auto",
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.md,
  },
  content: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  courseOverview: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  courseDescription: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  outcomesList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  outcomeItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  outcomeBullet: {
    marginTop: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.purple400,
  },
  outcomeText: {
    flex: 1,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modulesList: {
    marginBottom: Spacing.xl,
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  moduleItemLocked: {
    backgroundColor: Colors.textInputBg + "80",
    opacity: 0.6,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.purple400 + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  moduleRightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  moduleTitle: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  moduleTextLocked: {
    color: Colors.textSecondary,
  },
  moduleDescription: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  completedDate: {
    fontSize: 11,
    color: Colors.green,
    marginTop: 4,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.green + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.green,
    marginLeft: 4,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.textSecondary + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  progressCard: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressLabel: {
    fontSize: TextStyles.h4.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.purple400,
  },
  progressBarContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBackground: {
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
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStatsText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
  },
  instructorSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.textInputBg,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  instructorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: Spacing.md,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: TextStyles.h4.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  instructorRole: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  reviewsSectionCard: {
    backgroundColor: Colors.textInputBg,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  reviewsTopRow: {
    flexDirection: "row",
  },
  reviewsSummaryCol: {
    width: screenWidth * 0.48, // left column like the screenshot
    maxWidth: 340,
    paddingRight: Spacing.lg,
    alignItems: "flex-start",
  },
  reviewsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray500,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reviewsListTight: {
    // keep empty — makes the list feel part of the same section
  },
  ratingNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  starsContainer: {
    flexDirection: "row",
    marginVertical: Spacing.xs,
  },
  reviewCount: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
  },
  ratingBreakdown: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  starNumber: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textPrimary,
    width: 10,
    marginRight: Spacing.sm,
  },
  ratingBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray500,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: Colors.yellow,
    borderRadius: 3,
  },
  ratingPercentage: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
    minWidth: 28,
    textAlign: "right",
  },
  reviewItem: {
    backgroundColor: "transparent",
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray500,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  reviewerName: {
    fontSize: TextStyles.body.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  reviewPinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.purple400 + "14",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reviewPinnedText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.purple400,
  },
  reviewDate: {
    fontSize: TextStyles.caption.fontSize,
    color: Colors.textSecondary,
  },
  reviewRating: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  reviewText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  instructorReplyBox: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.textInputBg,
    borderRadius: 10,
    padding: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.purple400,
  },
  instructorReplyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  instructorReplyTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  instructorReplyText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  instructorReplyMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  noModulesContainer: {
    backgroundColor: Colors.textInputBg,
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  noModulesText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  noReviewsContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 1.5,
    paddingHorizontal: Spacing.lg,
  },
  noReviewsTitle: {
    fontSize: TextStyles.h4.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  noReviewsText: {
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
