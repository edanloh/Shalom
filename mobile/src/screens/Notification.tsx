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
import Reanimated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, Spacing, TextStyles } from "../constants";
import Screen from "../components/common/Screen";
import { useNotification } from "../contexts/NotificationContext";
import type { Notification as InAppNotification } from "../types";

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

function getIcon(type?: string) {
  switch (type) {
    case "achievement":      return { name: "trophy-outline",           color: Colors.yellow };
    case "course":           return { name: "book-outline",             color: Colors.blue };
    case "reminder":         return { name: "alarm-outline",            color: Colors.red };
    case "streak_hot":
    case "streak_reminder":  return { name: "flame-outline",            color: Colors.streakFire };
    case "streak_broken":    return { name: "warning-outline",          color: Colors.notificationRed };
    case "goal_completed":   return { name: "checkmark-circle-outline", color: Colors.secondary };
    case "goal_expired":     return { name: "time-outline",             color: Colors.notificationRed };
    default:                 return { name: "notifications-outline",    color: Colors.textSecondary };
  }
}

function SwipeDeleteAction({
  progress,
  onDelete,
}: {
  progress: SharedValue<number>;
  onDelete: () => void;
}) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * 72 }],
  }));
  return (
    <Reanimated.View style={[styles.swipeActionContainer, animStyle]}>
      <TouchableOpacity style={styles.swipeDelete} onPress={onDelete}>
        <Ionicons name="trash-outline" size={20} color={Colors.white} />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

type RowProps = {
  item: InAppNotification;
  onMarkRead: (id: string, userId: string) => void;
  onDelete: (id: string) => void;
  onOpen: (methods: SwipeableMethods) => void;
};

const NotificationRow = memo(function NotificationRow({
  item,
  onMarkRead,
  onDelete,
  onOpen,
}: RowProps) {
  const icon = getIcon(item.type);
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const renderRightActions = useCallback(
    (progress: SharedValue<number>) => (
      <SwipeDeleteAction progress={progress} onDelete={() => onDelete(item.id)} />
    ),
    [item.id, onDelete]
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
        onPress={() => onMarkRead(item.id, item.userId)}
      >
        <View style={[styles.iconBadge, { borderColor: icon.color }]}>
          {isIconUrl(item.iconUrl) ? (
            <Image source={{ uri: item.iconUrl }} style={styles.iconImage} resizeMode="cover" />
          ) : (
            <Ionicons name={icon.name as any} size={22} color={icon.color} />
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

const styles = StyleSheet.create({
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
  swipeDelete: {
    backgroundColor: Colors.notificationRed,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    flex: 1,
    borderRadius: 14,
  },
  swipeActionContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: Spacing.xs,
    paddingVertical: 2,
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
