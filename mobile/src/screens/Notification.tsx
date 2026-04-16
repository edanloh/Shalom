import { memo, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
  Modal,
  ActivityIndicator,
  SectionList,
  RefreshControl,
  DeviceEventEmitter,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, Spacing, TextStyles } from "../constants";
import Screen from "../components/common/Screen";
import { useNotification } from "../contexts/NotificationContext";
import { apiService } from "../services";
import type { Notification as InAppNotification } from "../types";

const extractCoursePathId = (actionUrl?: string) => {
  if (!actionUrl) return null;
  const match = actionUrl.trim().match(/^\/course\/([^/?]+)/);
  return match ? match[1] : null;
};

const isCourseCompletedNotification = (item: InAppNotification) => {
  const title = item.title?.trim().toLowerCase() ?? "";
  const message = item.message?.trim().toLowerCase() ?? "";
  return title === "course completed" || message.includes("your certificate is ready");
};

const isPointsHistoryNotification = (item: InAppNotification) => {
  const title = item.title?.trim().toLowerCase() ?? "";
  const message = item.message?.trim().toLowerCase() ?? "";

  return (
    item.type === "credits" ||
    item.type === "daily_login" ||
    item.type === "course_completed" ||
    item.type === "module_completed" ||
    item.type === "course_enrolled" ||
    item.type === "first_course_enrollment" ||
    item.type === "streak_milestone" ||
    title === "daily check-in" ||
    title === "enrolled" ||
    title === "credits earned" ||
    title === "perfect score!" ||
    message.includes("credits earned") ||
    message.includes("credits for") ||
    message.includes("credits added to your balance")
  );
};

const isLearningGoalNotification = (item: InAppNotification) => {
  const title = item.title?.trim().toLowerCase() ?? "";
  const message = item.message?.trim().toLowerCase() ?? "";

  return (
    item.type === "goal_set" ||
    item.type === "goal_completed" ||
    item.type === "goal_hit" ||
    item.type === "goal_expired" ||
    item.type === "reminder" ||
    item.relatedEntityType === "goal" ||
    title === "goals set" ||
    message.includes("goal is active") ||
    message.includes("goals are active")
  );
};

async function resolveGradeCourseId(item: InAppNotification): Promise<string | null> {
  if (item.relatedEntityType === "course" && item.relatedEntityId) {
    return item.relatedEntityId;
  }

  const candidateIds = Array.from(
    new Set(
      [
        item.relatedEntityType === "quiz" ? item.relatedEntityId : null,
        extractCoursePathId(item.actionUrl),
        item.relatedEntityId,
      ].filter(Boolean) as string[]
    )
  );

  for (const candidateId of candidateIds) {
    try {
      const response = await apiService.get<{
        success: boolean;
        data?: { course?: { id?: string } };
      }>(`/getQuizDetail/${candidateId}`, item.userId ? { userId: item.userId } : undefined);
      const courseId = response?.data?.course?.id;
      if (courseId) return courseId;
    } catch {
      // Candidate is not a quiz id we can recover from. Try the next one.
    }
  }

  return null;
}

function resolveNotificationRoute(
  item: InAppNotification
): { screen: string; params?: Record<string, unknown> } | null {
  if (isCourseCompletedNotification(item)) {
    return { screen: "CertificatesScreen" };
  }
  if (isPointsHistoryNotification(item)) {
    return { screen: "PointsHistory" };
  }
  if (isLearningGoalNotification(item)) {
    return { screen: "LearningGoalScreen" };
  }

  if (item.actionUrl) {
    const url = item.actionUrl.trim();

    // Handle URL-style paths like /course/<id> or /achievement/<id>
    const courseIdFromUrl = item.type === "grade" ? null : extractCoursePathId(url);
    if (courseIdFromUrl) {
      return { screen: "CourseDetail", params: { courseId: courseIdFromUrl } };
    }
    const achievementMatch = url.match(/^\/achievement/);
    if (achievementMatch) {
      return { screen: "AchievementsScreen" };
    }

    // Handle screen-name style: "ScreenName" or "ScreenName?key=value"
    if (!url.startsWith("/")) {
      const [screenPart, queryPart] = url.split("?");
      const screen = screenPart.trim();
      const params: Record<string, string> = {};
      if (queryPart) {
        for (const pair of queryPart.split("&")) {
          const [k, v] = pair.split("=");
          if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
        }
      }
      return { screen, params: Object.keys(params).length > 0 ? params : undefined };
    }
  }
  // Course-related: use related_entity_id as courseId when available
  if (item.type === "course") {
    if (item.relatedEntityType === "course" && item.relatedEntityId) {
      return { screen: "CourseDetail", params: { courseId: item.relatedEntityId } };
    }
    const courseId = item.relatedEntityId ?? null;
    if (courseId) return { screen: "CourseDetail", params: { courseId } };
    return { screen: "Courses" };
  }

  if (item.type === "grade") {
    if (item.relatedEntityType === "course" && item.relatedEntityId) {
      return { screen: "CourseDetail", params: { courseId: item.relatedEntityId } };
    }
    return { screen: "Courses" };
  }

  // Course announcements embed the courseId in the type string.
  // Patterns: "course_announcement-<courseId>-<uuid>" or "course_announcement-new-<courseId>"
  // Use a loose UUID search anywhere in the string to handle both.
  if (item.type?.startsWith("course_announcement")) {
    const uuidMatch = item.type.match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    if (uuidMatch) {
      return { screen: "CourseDetail", params: { courseId: uuidMatch[1] } };
    }
    return { screen: "Courses" };
  }

  switch (item.type) {
    case "message":
      return { screen: "Messages" };
    case "wishlist":
      return { screen: "Wishlist" };
    case "achievement":
    case "achievement_reward":
      return { screen: "AchievementsScreen" };
    case "credits":
    case "daily_login":
    case "course_completed":
    case "module_completed":
    case "course_enrolled":
    case "first_course_enrollment":
    case "streak_milestone":
      return { screen: "PointsHistory" };
    case "streak_hot":
    case "streak_reminder":
    case "streak_broken":
    case "goal_completed":
    case "goal_hit":
    case "goal_expired":
    case "goal_set":
    case "reminder":
      // Instructor task reminders have no mobile destination — read-only.
      if (item.relatedEntityType === "instructor_task") return null;
      return { screen: "LearningGoalScreen" };
    default:
      return null;
  }
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};

const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const UNKNOWN_DATE_LABEL = "Unknown date";

const isIconUrl = (value?: string) =>
  !!value && (value.startsWith("http://") || value.startsWith("https://"));

const parseValidDate = (value?: string | null) => {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

type NotificationAppearance = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  borderColor: string;
};

function getNotificationAppearance(item: InAppNotification): NotificationAppearance {
  if (isCourseCompletedNotification(item)) {
    return {
      name: "ribbon-outline",
      color: Colors.certificateCardBg,
      borderColor: Colors.certificateCardBg,
    };
  }

  if (item.type?.startsWith("course_announcement")) {
    return {
      name: "megaphone-outline",
      color: Colors.accent,
      borderColor: Colors.accent,
    };
  }

  switch (item.type) {
    case "achievement":
      return { name: "trophy-outline", color: Colors.yellow, borderColor: Colors.yellow };
    case "credits":
    case "course_completed":
    case "module_completed":
    case "course_enrolled":
    case "first_course_enrollment":
      return { name: "wallet-outline", color: Colors.green, borderColor: Colors.green };
    case "grade":
      return { name: "clipboard-outline", color: Colors.green, borderColor: Colors.green };
    case "assignment":
      return { name: "document-text-outline", color: Colors.streakFire, borderColor: Colors.streakFire };
    case "course":
      return { name: "school-outline", color: Colors.blue, borderColor: Colors.blue };
    case "message":
      return { name: "chatbubble-ellipses-outline", color: Colors.blue, borderColor: Colors.blue };
    case "wishlist":
      return { name: "heart-outline", color: Colors.notificationRed, borderColor: Colors.notificationRed };
    case "daily_login":
      return { name: "sparkles-outline", color: Colors.secondary, borderColor: Colors.secondary };
    case "shop_purchase":
      return { name: "bag-handle-outline", color: Colors.categoryDefault, borderColor: Colors.categoryDefault };
    case "goal_completed":
    case "goal_hit":
    case "goal_set":
      return { name: "checkmark-circle-outline", color: Colors.secondary, borderColor: Colors.secondary };
    case "goal_expired":
      return { name: "hourglass-outline", color: Colors.notificationRed, borderColor: Colors.notificationRed };
    case "reminder":
      return { name: "alarm-outline", color: Colors.red, borderColor: Colors.red };
    case "streak_hot":
    case "streak_reminder":
    case "streak_increment":
    case "streak_milestone":
      return { name: "flame-outline", color: Colors.streakFire, borderColor: Colors.streakFire };
    case "streak_broken":
      return { name: "warning-outline", color: Colors.notificationRed, borderColor: Colors.notificationRed };
    case "achievement_reward":
      return { name: "gift-outline", color: Colors.yellow, borderColor: Colors.yellow };
    default:
      return {
        name: "notifications-outline",
        color: Colors.textSecondary,
        borderColor: Colors.gray500,
      };
  }
}

function SwipeActions({
  dragX,
  isRead,
  onMarkRead,
  onDelete,
}: {
  dragX: SharedValue<number>;
  isRead: boolean;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  // Keep buttons pixel-perfect in sync with the drag at any swipe speed.
  // dragX is negative when swiping left; buttons slide in from the right edge.
  // two buttons: 60 + 60 + 4 gap (Spacing.xs) + 4 paddingLeft = 128; one button: 60 + 4 = 64
  const containerWidth = isRead ? 64 : 128;
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: containerWidth + dragX.value }],
  }));
  return (
    <Reanimated.View style={[styles.swipeActionContainer, animStyle]}>
      {!isRead ? (
        <Pressable style={styles.swipeRead} onPress={onMarkRead}>
          <Ionicons name="checkmark" size={20} color={Colors.white} />
        </Pressable>
      ) : null}
      <Pressable style={styles.swipeDelete} onPress={onDelete}>
        <Ionicons name="trash-outline" size={20} color={Colors.white} />
      </Pressable>
    </Reanimated.View>
  );
}

type RowProps = {
  item: InAppNotification;
  onMarkRead: (id: string, userId: string) => void;
  onDelete: (id: string) => void;
  onOpen: (methods: SwipeableMethods) => void;
  onNavigate: (item: InAppNotification) => void;
};

const NotificationRow = memo(function NotificationRow({
  item,
  onMarkRead,
  onDelete,
  onOpen,
  onNavigate,
}: RowProps) {
  const appearance = getNotificationAppearance(item);
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const handleSwipeMarkRead = useCallback(() => {
    swipeableRef.current?.close();
    onMarkRead(item.id, item.userId);
  }, [item.id, item.userId, onMarkRead]);

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, dragX: SharedValue<number>) => (
      <SwipeActions
        dragX={dragX}
        isRead={item.read}
        onMarkRead={handleSwipeMarkRead}
        onDelete={() => onDelete(item.id)}
      />
    ),
    [item.id, item.read, handleSwipeMarkRead, onDelete]
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={1.5}
      rightThreshold={40}
      onSwipeableOpen={() => {
        if (swipeableRef.current) onOpen(swipeableRef.current);
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.row,
          !item.read ? styles.rowUnread : null,
          item.read ? styles.rowRead : null,
        ]}
        onPress={() => onNavigate(item)}
      >
        <View style={[styles.iconBadge, { borderColor: appearance.borderColor }]}>
          {isIconUrl(item.iconUrl) ? (
            <Image source={{ uri: item.iconUrl }} style={styles.iconImage} resizeMode="cover" />
          ) : (
            <Ionicons name={appearance.name} size={22} color={appearance.color} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              TextStyles.body,
              item.read ? styles.titleRead : styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              TextStyles.captionSmall,
              item.read ? styles.messageRead : styles.messageUnread,
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
        </View>
        {!item.read ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
});

export default function NotificationsScreen({ navigation }: any) {
  const {
    inAppNotifications,
    reloadNotifications,
    loadMoreNotifications,
    hasMoreNotifications,
    isLoadingNotifications,
    isLoadingMoreNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    deleteNotification,
  } = useNotification();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<View>(null);
  const lastScrollY = useRef(0);
  const tabHidden = useRef(false);
  const openRowRef = useRef<SwipeableMethods | null>(null);

  const handleRowOpen = useCallback((methods: SwipeableMethods) => {
    if (openRowRef.current && openRowRef.current !== methods) {
      openRowRef.current.close();
    }
    openRowRef.current = methods;
  }, []);

  const handleNotificationNavigate = useCallback(
    async (item: InAppNotification) => {
      if (!item.read) {
        markNotificationRead(item.id, item.userId);
      }

      if (item.type === "grade") {
        const courseId = await resolveGradeCourseId(item);
        if (courseId) {
          navigation.navigate("CourseDetail" as any, { courseId } as any);
          return;
        }
      }

      const route = resolveNotificationRoute(item);
      if (route) {
        navigation.navigate(route.screen as any, route.params as any);
      }
    },
    [markNotificationRead, navigation]
  );

  const sections = useMemo(() => {
    const today: InAppNotification[] = [];
    const yesterday: InAppNotification[] = [];
    const byDate: Record<string, InAppNotification[]> = {};
    const ordered = [...inAppNotifications].sort(
      (a, b) => {
        const bTime = parseValidDate(b.createdAt)?.getTime() ?? 0;
        const aTime = parseValidDate(a.createdAt)?.getTime() ?? 0;
        return bTime - aTime;
      }
    );

    for (const n of ordered) {
      const dt = parseValidDate(n.createdAt);
      if (!dt) {
        if (!byDate[UNKNOWN_DATE_LABEL]) byDate[UNKNOWN_DATE_LABEL] = [];
        byDate[UNKNOWN_DATE_LABEL].push(n);
        continue;
      }

      if (isToday(dt)) {
        today.push(n);
      } else if (isYesterday(dt)) {
        yesterday.push(n);
      } else {
        const key = fmt.format(dt); // e.g., "Sep 2, 2025"
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(n);
      }
    }

    const result: Array<{ title: string; data: InAppNotification[] }> = [];
    if (today.length) result.push({ title: 'Today', data: today });
    if (yesterday.length) result.push({ title: 'Yesterday', data: yesterday });

    // Add older groups sorted by most-recent first
    const olderDates = Object.keys(byDate)
      .sort((a, b) => {
        if (a === UNKNOWN_DATE_LABEL) return 1;
        if (b === UNKNOWN_DATE_LABEL) return -1;
        return new Date(b).getTime() - new Date(a).getTime();
      });

    for (const key of olderDates) {
      result.push({ title: key, data: byDate[key] });
    }

    return result;
  }, [inAppNotifications]);

  const [refreshing, setRefreshing] = useState(false);


  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setMenuOpen(false);
      await reloadNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [reloadNotifications]);

  useFocusEffect(
    useCallback(() => {
      return () => setMenuOpen(false);
    }, [])
  );


  const hasNotifications = inAppNotifications.length > 0;
  const hasUnread = inAppNotifications.some((item) => !item.read);

  const onMarkAllRead = useCallback(() => {
    if (!hasUnread) return;
    setMenuOpen(false);
    markAllNotificationsRead();
  }, [hasUnread, markAllNotificationsRead]);

  const onClearAll = useCallback(() => {
    if (!hasNotifications) return;
    setMenuOpen(false);
    Alert.alert(
      "Clear all notifications?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearNotifications(),
        },
      ]
    );
  }, [clearNotifications, hasNotifications]);

  const onToggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    menuButtonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setMenuPos({ top: y + height + 6, left: x });
      setMenuOpen(true);
    });
  };


  return (
    <Screen
      title="Notifications"
      customEdges={["top"]}
      refreshing={refreshing}
      onRefresh={onRefresh}
      useScrollView={false}
      disableChildrenWrapper
      headerLeftComponent={
        <View style={styles.menuAnchor}>
          <TouchableOpacity
            ref={menuButtonRef}
            onPress={onToggleMenu}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      }
      headerRightIcon="settings-outline"
      onHeaderRightPress={() => navigation.navigate("Settings")}
      stickyHeader
    >
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuModalRoot}>
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[styles.menuModalAnchor, menuPos ? { top: menuPos.top, left: menuPos.left } : null]}>
            <View style={styles.menu}>
              <Pressable
                onPress={onMarkAllRead}
                style={[
                  styles.menuItem,
                  !hasUnread ? styles.menuItemDisabled : null,
                ]}
                disabled={!hasUnread}
              >
                <Text
                  style={[
                    styles.menuText,
                    !hasUnread ? styles.menuTextDisabled : null,
                  ]}
                >
                  Mark all as read
                </Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable
                onPress={onClearAll}
                style={[
                  styles.menuItem,
                  !hasNotifications ? styles.menuItemDisabled : null,
                ]}
                disabled={!hasNotifications}
              >
                <Text
                  style={[
                    styles.menuText,
                    styles.menuDanger,
                    !hasNotifications ? styles.menuTextDisabled : null,
                  ]}
                >
                  Clear all
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          String(
            item.id ??
              `notification-${index}-${item.createdAt ?? item.title ?? item.message ?? "row"}`
          )
        }
        renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onMarkRead={markNotificationRead}
              onDelete={deleteNotification}
              onOpen={handleRowOpen}
              onNavigate={handleNotificationNavigate}
            />
          )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={TextStyles.h5}>{section.title}</Text>
          </View>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
            colors={[Colors.secondary]}
          />
        }
        ListEmptyComponent={
          isLoadingNotifications ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-outline"
                size={36}
                color={Colors.textSecondary}
              />
              <Text style={[TextStyles.body, styles.emptyTitle]}>
                No notifications yet
              </Text>
              <Text style={[TextStyles.captionSmall, styles.emptySubtitle]}>
                Toast updates will appear here automatically.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMoreNotifications ? (
            <View style={styles.footer}>
              {isLoadingMoreNotifications ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : null}
            </View>
          ) : (
            <View style={styles.footer} />
          )
        }
        onEndReached={loadMoreNotifications}
        onEndReachedThreshold={0.6}
        stickySectionHeadersEnabled={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const dy = y - lastScrollY.current;
          if (Math.abs(dy) < 8) return;
          if (dy > 0 && y > 40 && !tabHidden.current) {
            tabHidden.current = true;
            DeviceEventEmitter.emit("tabbar:toggle", { visible: false });
          } else if (dy < 0 && tabHidden.current) {
            tabHidden.current = false;
            DeviceEventEmitter.emit("tabbar:toggle", { visible: true });
          }
          lastScrollY.current = y;
        }}
      />
    </Screen>
  );
}

const THUMB = 56;
const NOTIFICATION_ROW_MIN_HEIGHT = THUMB + Spacing.sm * 2;

const styles = StyleSheet.create({
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: NOTIFICATION_ROW_MIN_HEIGHT,
    borderRadius: 14,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  rowUnread: {
    backgroundColor: "rgba(86, 75, 235, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  rowRead: {
    opacity: 0.6,
  },
  iconBadge: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    marginRight: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.8,
    backgroundColor: Colors.backgroundGray,
  },
  iconImage: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
  },
  titleUnread: {
    fontWeight: "700",
    color: Colors.white,
  },
  titleRead: {
    color: Colors.textSecondary,
  },
  messageUnread: {
    color: Colors.textSecondary,
  },
  messageRead: {
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.notificationRed,
    marginLeft: Spacing.sm,
  },
  swipeRead: {
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    minHeight: NOTIFICATION_ROW_MIN_HEIGHT,
    height: "100%",
    borderRadius: 14,
  },
  swipeDelete: {
    backgroundColor: Colors.notificationRed,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    minHeight: NOTIFICATION_ROW_MIN_HEIGHT,
    height: "100%",
    borderRadius: 14,
  },
  swipeActionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "stretch",
    gap: Spacing.xs,
    paddingLeft: Spacing.xs,
    paddingVertical: 0,
    marginBottom: Spacing.xs,
    alignSelf: "stretch",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    marginTop: Spacing.xs,
  },
  loadingState: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  menuAnchor: {
    position: "relative",
    zIndex: 30,
  },
  menuButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  menu: {
    minWidth: 170,
    backgroundColor: "rgba(20, 20, 24, 0.95)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: Spacing.xs,
    zIndex: 40,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  menuItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  menuText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  menuTextDisabled: {
    color: Colors.textMuted,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuDanger: {
    color: Colors.notificationRed,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  menuModalRoot: {
    flex: 1,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  menuModalAnchor: {
    position: "absolute",
    top: 56,
    left: Spacing.lg,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
