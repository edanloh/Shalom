import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ImageWithFallback } from "../common"; // adjust path if needed
import { Colors, Spacing, TextStyles, Typography } from "../../constants";
import { Images } from "../../../assets";
import type { Course } from "../../types";
import { useCourses } from "../../contexts/CourseContext";
import { formatPrimaryRecommendationReason } from "../../utils/recommendations";

type Variant = "compact" | "progress";

interface Props {
  course: Course;
  onPress?: (course: Course) => void;
  onDismiss?: (course: Course) => void;
  variant?: Variant;
  // Optional toggles for subparts
  showInstructor?: boolean;
  showRecommendationReason?: boolean;
}

const MetaRow = ({ rating, modules }: { rating: number; modules?: number }) => (
  <View style={styles.metaRow}>
    <Ionicons name="star" size={12} color="#FACC15" />
    <Text style={styles.metaText}>{rating?.toFixed?.(1) ?? rating}</Text>
    <Text style={styles.metaDot}>•</Text>
    <Text style={styles.metaText}>{modules ?? 0} modules</Text>
  </View>
);

const getCourseProgressPercent = (course: Course): number => {
  const candidates = [
    (course as any)?.progress_percentage,
    (course as any)?.progress?.percentage,
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.min(100, Math.round(numeric)));
    }
  }
  return 0;
};

export default function CourseCard({
  course,
  onPress,
  onDismiss,
  variant = "compact",
  showInstructor = false,
  showRecommendationReason = true,
}: Props) {
  const progressPercent = getCourseProgressPercent(course);
  const { wishlist = [], toggleWishlist } = useCourses();
  const isWishlisted = !!wishlist?.some((c) => c.id === course.id);
  const heartScale = useRef(new Animated.Value(1)).current;
  const hasRecommendationScore = Number.isFinite(course.recommendationScore);
  const hasRecommendationRank = Number.isFinite(course.recommendationRank);
  const rankLabel = hasRecommendationRank
    ? `#${course.recommendationRank}`
    : null;
  const reasonText = formatPrimaryRecommendationReason(
    course.recommendationPrimaryTag
  );

  const handleToggleWishlist = () => {
    heartScale.stopAnimation();
    heartScale.setValue(0.88);
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.18,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
    toggleWishlist(course);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.card,
        variant === "compact" ? styles.cardCompact : styles.cardProgress,
      ]}
      onPress={() => onPress?.(course)}
    >
      {/* Image block with overlay */}
      <View style={styles.imageWrap}>
        <ImageWithFallback
          source={{ uri: course?.image }}
          fallback={Images.coursePlaceholder ?? Images.placeholder}
          style={
            variant === "compact" ? styles.imageCompact : styles.imageProgress
          }
        />

        <View style={styles.badgeRow}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleToggleWishlist();
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            style={styles.heartBtn}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isWishlisted ? "heart" : "heart-outline"}
                size={18}
                color="#fff"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
        {rankLabel ? (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rankLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Category Badge */}
      <View
        style={[
          styles.catBadge,
          { backgroundColor: course.categoryColor || Colors.categoryDefault },
        ]}
      >
        <Text style={TextStyles.bodySmall}>{course.category}</Text>
      </View>

      {/* Text/content */}
      <View style={styles.content}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={2}>
            {course.title}
          </Text>
        </View>
        <MetaRow rating={course.rating} modules={course.modules} />
        {showRecommendationReason && (reasonText || onDismiss) ? (
          <View style={styles.reasonRow}>
            {reasonText ? (
              <Text style={styles.reason} numberOfLines={1}>
                {reasonText}
              </Text>
            ) : <View />}
            {onDismiss ? (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onDismiss(course); }}
                hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                accessibilityLabel="Not for me"
                accessibilityRole="button"
              >
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {showInstructor && course.instructor?.name ? (
          <Text style={styles.instructor} numberOfLines={1}>
            {`Mr. ${course.instructor.name}`}
          </Text>
        ) : null}

        {variant === "progress" ? (
          <View style={{ marginTop: 8 }}>
            <View style={styles.progressWrap}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {progressPercent}% complete
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const w = Dimensions.get("window").width;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  cardCompact: {
    width: Math.min(w * 0.72, 300),
    marginRight: 12,
  },
  cardProgress: {
    width: Math.min(w * 0.72, 300),
    marginRight: 12,
  },

  imageWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  imageCompact: {
    width: "100%",
    height: 150,
    backgroundColor: "#3A3A45",
  },
  imageProgress: {
    width: "100%",
    height: 150,
    backgroundColor: "#3A3A45",
  },

  badgeRow: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catBadge: {
    width: "auto",
    alignSelf: "flex-start",
    marginTop: Spacing.md,
    backgroundColor: Colors.categoryDefault,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.md,
  },
  heartBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },
  rankBadge: {
    position: "absolute",
    left: Spacing.sm,
    top: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rankText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },

  content: {
    paddingBottom: Spacing.xs,
  },
  titleWrap: {
    marginTop: 10,
    minHeight: 42,
    justifyContent: "flex-start",
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 2,
    fontFamily: Typography.fontFamily.semiBold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingHorizontal: 2,
    gap: 4,
  },
  reason: {
    flex: 1,
    color: Colors.purple200,
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
  },
  dismissText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Typography.fontFamily.regular,
  },
  metaDot: { color: Colors.textSecondary, marginHorizontal: 4 },

  instructor: {
    color: Colors.textSecondary,
    fontSize: 12.5,
    paddingHorizontal: 2,
    paddingTop: 4,
    fontFamily: Typography.fontFamily.regular,
  },

  progressWrap: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#4B4B57",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: Colors.purple400,
  },
  progressLabel: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
  },
});
