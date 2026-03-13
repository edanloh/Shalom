import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";

import { useCourses } from "../contexts/CourseContext";
import type { MainStackParamList } from "@/types/navigation";
import { Colors, Typography, Spacing, TextStyles } from "../constants";
import { ImageWithFallback } from "../components/common";
import AnimatedHeartButton from "../components/common/AnimatedHeartButton";
import { Images } from "../../assets";
import Screen from "../components/common/Screen";
import { ActionButton } from "@/components";

const MetaRow = ({ rating, modules }: { rating: number; modules?: number }) => (
  <View style={styles.metaRow}>
    <Ionicons name="star" size={12} color="#FACC15" />
    <Text style={styles.metaText}>{rating?.toFixed?.(1) ?? rating}</Text>
    <Text style={styles.metaDot}>•</Text>
    <Text style={styles.metaText}>{modules ?? 0} modules</Text>
  </View>
);

export default function WishlistScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const {
    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    toggleWishlist,
    recordRecommendationEvent,
  } = useCourses();

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        recordRecommendationEvent(item.id, 'click', 'wishlist').catch(() => {});
        navigation.navigate("CourseDetail", { courseId: item.id });
      }}
      style={styles.card}
    >
      {/* Left: text */}
      <View style={styles.cardLeft}>
        {/* Category badge */}
        <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor || Colors.purple400 }]}>
          <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <MetaRow rating={item.rating} modules={item.modules} />
      </View>

      {/* Right: image + heart */}
      <View style={styles.cardRight}>
        <ImageWithFallback
          source={{ uri: item.image }}
          fallback={Images.coursePlaceholder}
          style={styles.cardImage}
        />
        <View style={styles.badgeRow}>
          <AnimatedHeartButton
            onPress={() => toggleWishlist(item)}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            style={styles.heartBtn}
            accessibilityLabel="Remove from wishlist"
            filled
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state (no list yet)
  if (wishlistLoading && (!wishlist || wishlist.length === 0)) {
    return (
      <Screen
        title="Wishlist"
        navigation={navigation}
        headerLeftIcon="chevron-back"
        stickyHeader
      >
        <View style={[styles.centerContainer, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={[TextStyles.body, { paddingTop: Spacing.md }]}>
            Loading your favourites…
          </Text>
        </View>
      </Screen>
    );
  }

  // Error state (no list yet)
  if (wishlistError && (!wishlist || wishlist.length === 0)) {
    return (
      <Screen
        title="Wishlist"
        navigation={navigation}
        headerLeftIcon="chevron-back"
        stickyHeader
      >
        <View>
          <Text style={styles.errorMessage}>Error: {wishlistError}</Text>
          <ActionButton text="Retry" onPress={refreshWishlist} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Wishlist"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      stickyHeader
    >
      <FlatList
        data={wishlist}
        keyExtractor={(item, index) => {
          const rawId = item?.id;
          if (rawId !== undefined && rawId !== null && String(rawId).length > 0) {
            return String(rawId);
          }
          return `wishlist-${index}-${item?.title ?? "unknown"}`;
        }}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshing={!!wishlistLoading}
        onRefresh={refreshWishlist}
        scrollEnabled={false}
        contentContainerStyle={wishlist.length === 0 ? styles.emptyListContent : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="heart-outline"
              size={48}
              color={Colors.textMuted ?? Colors.textSecondary}
            />
            <Text style={TextStyles.body}>Your wishlist is empty</Text>
            <Text style={TextStyles.caption}>
              Tap the heart on any course to save it here.
            </Text>
            <ActionButton
              text="Browse courses"
              onPress={() => navigation.goBack()}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.red,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },

  card: {
    flexDirection: "row",
    backgroundColor: Colors.gray600,
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 110,
    maxHeight: 160,
  },
  cardLeft: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
    paddingRight: Spacing.md,
    flexShrink: 1,
    minWidth: 0,
  },
  leftTitle: {
    fontFamily: TextStyles.h4.fontFamily,
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
    marginBottom: Spacing.xs,
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
    fontFamily: Typography?.fontFamily?.semiBold ?? TextStyles.body.fontFamily,
    marginBottom: 8,
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
    flexWrap: "wrap",
  },

  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: Typography?.fontFamily?.regular ?? TextStyles.body.fontFamily,
  },

  metaDot: { color: Colors.textSecondary, marginHorizontal: 4 },

  cardRight: {
    width: 140,
    alignSelf: "stretch",
    position: "relative",
    overflow: "hidden",
  },
  cardImage: { flex: 1, width: 150, resizeMode: "cover" },
  badgeRow: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: Spacing.sm,
    maxWidth: "72%",
    flexShrink: 1,
  },
  categoryText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  heartBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    gap: Spacing.base,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});
