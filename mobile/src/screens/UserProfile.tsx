import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Text,
  Image,
  RefreshControl,
  DeviceEventEmitter,
} from "react-native";
import { Colors, Spacing, TextStyles } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { ImageWithFallback } from "../components/common";
import { Images } from "../../assets";
import { getAvatarUri } from "@/utils/avatar";
import { ActionButton, Screen } from "@/components";
import externalStyles from "@styles/styles";
import CustomModal from "../components/common/CustomModal";
import creditService from "../services/creditService";
import { showToast } from "@/components/common/Toast";
import { AchievementItem, CreditEvent } from "../types";

const CARD_BG = "#3A3A45";
const TILE_BG = "#5B38E3";

type Achievement = {
  icon: string;
  label: string;
  description?: string;
  earnedOn?: string;
  points?: number;
};

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [balance, setBalance] = useState<number>((user as any)?.points ?? 0);
  const [creditHistory, setCreditHistory] = useState<CreditEvent[]>([]);
  const [achievementsData, setAchievementsData] = useState<AchievementItem[]>([]);
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastScrollY = useRef(0);
  const tabHidden = useRef(false);

  // Safe fallbacks so the UI renders even if some fields are missing
  const displayName = user?.name ?? "User";
  const avatarUri = getAvatarUri(user);
  const avatarSrc = avatarUri ? { uri: avatarUri } : Images.profile;

  const quickActions = useMemo(
    () => [
      {
        label: "Points History",
        icon: "trending-up-outline",
        action: () => navigation.navigate("PointsHistory"),
      },
      {
        label: "Learning Goal",
        icon: "podium-outline",
        action: () => navigation.navigate("LearningGoalScreen"),
      },
      {
        label: "Certificates",
        icon: "ribbon-outline",
        action: () => navigation.navigate("CertificatesScreen"),
      },
    ],
    []
  );

  const loadCredits = React.useCallback(async () => {
    try {
      const uid = user?.id;
      if (!uid) {
        setBalance(0);
        setAchievementsData([]);
        setCreditHistory([]);
        return;
      }
      const [bal, ach, hist] = await Promise.all([
        creditService.getCreditBalance(uid).catch(() => null),
        creditService.getAchievements(uid).catch(() => []),
        creditService.getCreditHistory(uid).catch(() => []),
      ]);
      if (bal?.balance != null) setBalance(bal.balance);

      const iconFor = (a: any) => {
        const byType: Record<string, string> = {
          badge: "trophy-outline",
          streak: "flame",
          certificate: "ribbon-outline",
          level: "ribbon-outline",
        };
        return byType[a.type] || byType[a.icon] || "trophy-outline";
      };

      const normalized = (Array.isArray(ach) ? ach : [])
        .filter((a: any) => a.earned !== false)
        .map((a: any) => ({
       ...a,
       label: a.label || a.name || "Achievement",
       icon: iconFor(a),
      }));
      setAchievementsData(normalized);
      setCreditHistory(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.warn("Profile: failed to load credits/achievements", err);
      showToast({
        title: "Credits unavailable",
        message: "Could not refresh credits right now.",
        type: "error",
      });
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCredits();
    } catch (err) {
      console.warn("Profile: failed to refresh credits/achievements", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCredits();
    const unsub = creditService.subscribeToCreditUpdates(loadCredits);
    return () => {
      if (unsub) unsub();
    };
  }, [loadCredits]);

  type AccountItemIcon =
    | "person-outline"
    | "shield-checkmark-outline"
    | "lock-closed-outline";

  const accountItems = useMemo(() => {
    const items: {
      icon: AccountItemIcon;
      title: string;
      subtitle: string;
      onPress: () => void;
    }[] = [
      {
        icon: "person-outline",
        title: "Edit Profile",
        subtitle: "Update your personal information",
        onPress: () => navigation.navigate("EditProfile"),
      },
      {
        icon: "shield-checkmark-outline",
        title: "Privacy & Security",
        subtitle: "Manage your privacy settings",
        onPress: () => console.log("Navigate to Privacy & Security"),
      },
    ];
    if (user?.auth_provider !== "google") {
      items.push({
        icon: "lock-closed-outline",
        title: "Change Password",
        subtitle: "Update your account password",
        onPress: () => navigation.navigate("ChangePassword"),
      });
    }
    return items;
  }, [navigation, user]);

  return (
    <Screen
      title="Profile"
      navigation={navigation}
      headerRightIcon="settings-outline"
      onHeaderRightPress={() => navigation.navigate("Settings")}
      customEdges={["top"]}
      useScrollView={false}
      disableChildrenWrapper
    >
      <ScrollView
        contentContainerStyle={[externalStyles.fullScrollContent]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.secondary}
            colors={[Colors.secondary]}
          />
        }
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
      >
        <View style={externalStyles.scrollContent}>
          {/* Avatar & name */}
          <View style={[externalStyles.header, { marginBottom: 16 }]}>
            <View style={[externalStyles.logo, { marginBottom: 16 }]}>
              <ImageWithFallback
                source={avatarSrc}
                fallback={Images.profile}
                style={externalStyles.avatar}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[TextStyles.h3, { marginBottom: Spacing.xs }]}>
                {displayName}
              </Text>
              {user?.auth_provider && user?.auth_provider == "google" && (
                <Image
                  source={require("@assets/google.png")}
                  style={{
                    width: 24,
                    height: 24,
                    resizeMode: "contain",
                    marginLeft: 12,
                    marginBottom: 8,
                  }}
                />
              )}
            </View>
            <Text style={TextStyles.bodyMedium}>{balance} points</Text>
          </View>

        {/* Quick actions (visual-only) */}
        <View style={styles.quickRow}>
          {quickActions.map((qa) => (
            // <View key={qa.label} style={styles.quickCard}>
            <Pressable
              key={qa.label}
              style={styles.quickCard}
              onPress={() => {
                qa.action();
              }}
            >
              <Ionicons name={qa.icon as any} size={22} color={Colors.white} />
              <Text style={styles.quickLabel}>{qa.label}</Text>
            </Pressable>
          ))}
       </View>

        {/* Recent Achievements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          {/* visual-only */}
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("AchievementsScreen");
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

       <View style={styles.achievementsGrid}>
         {(() => {
           if (!achievementsData.length) return [];
           return achievementsData.slice(0, 6);
         })().map((a) => (
           <TouchableOpacity
             key={a.label}
             style={styles.achievementItem}
             activeOpacity={0.7}
             onPress={() => setSelectedAchievement(a)}
           >
             <Ionicons
               name={a.icon as any}
               size={26}
               color="#FACC15"
               style={styles.achievementIcon}
             />
             <Text style={styles.achievementLabel} numberOfLines={2}>
               {a.label}
             </Text>
           </TouchableOpacity>
         ))}
       </View>
       {!achievementsData.length ? (
         <Text style={styles.emptyAchievementsText}>
           No achievements yet
         </Text>
       ) : null}

        {/* Account Settings */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>
          Account Settings
        </Text>

        <View style={styles.settingsCard}>
          {accountItems.map((item, idx) => (
            <React.Fragment key={item.title}>
              <Pressable
                onPress={item.onPress}
                android_ripple={{ color: "rgba(255,255,255,0.08)" }}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
              </Pressable>

              {idx < accountItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Logout (active) */}
        <ActionButton text="Log Out" onPress={logout} />
        <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Achievement Detail Modal */}
      <CustomModal
        visible={selectedAchievement !== null}
        onClose={() => setSelectedAchievement(null)}
      >
        {/* Achievement Icon */}
        <View style={styles.modalIconContainer}>
          <View style={styles.modalIconBadge}>
            <Ionicons
              name={selectedAchievement?.icon as any}
              size={64}
              color={Colors.yellow}
            />
          </View>
        </View>

        <Text
          style={[
            TextStyles.h3,
            { textAlign: "center", marginBottom: Spacing.md },
          ]}
        >
          {selectedAchievement?.label}
        </Text>

        <Text
          style={[
            TextStyles.body,
            {
              textAlign: "center",
              marginBottom: Spacing.lg,
              color: Colors.textSecondary,
            },
          ]}
        >
          {selectedAchievement?.description}
        </Text>

        {/* Points Badge */}
        {selectedAchievement?.points && (
          <View
            style={[
              styles.pointsBadge,
              { alignSelf: "center", marginBottom: Spacing.md },
            ]}
          >
            <Ionicons
              name="flame"
              size={20}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={[TextStyles.bodyMedium, { color: "#fff" }]}>
              + {selectedAchievement.points} points
            </Text>
          </View>
        )}

        {/* Earned On */}
        {selectedAchievement?.earnedOn && (
          <Text
            style={[
              TextStyles.caption,
              { textAlign: "center", marginTop: Spacing.md },
            ]}
          >
            Earned on: {selectedAchievement.earnedOn}
          </Text>
        )}
      </CustomModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Quick actions
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: TILE_BG,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  quickLabel: {
    marginTop: 8,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 13,
    color: Colors.white,
    fontWeight: "600",
  },

  // Achievements
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  viewAllText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 13,
    color: "#C4B5FD",
    fontWeight: "600",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: Spacing.sm,
    rowGap: 18,
    marginBottom: Spacing.md,
    marginTop: 8,
  },
  achievementItem: {
    width: "30%", // 3 per row
    alignItems: "center",
  },
  achievementIcon: {
    marginVertical: 8,
  },
  achievementLabel: {
    textAlign: "center",
    fontFamily: TextStyles.caption?.fontFamily ?? TextStyles.body.fontFamily,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  emptyAchievementsText: {
    textAlign: "center",
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  historyCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#4B4B57",
  },
  historyTextWrap: {
    flexShrink: 1,
    paddingRight: Spacing.md,
  },
  historyTitle: {
    color: Colors.textPrimary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
  },
  historyMeta: {
    color: Colors.textSecondary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 12,
  },
  historyPoints: {
    color: Colors.purple200,
    fontFamily: TextStyles.h4.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    fontWeight: "700",
  },
  historyEmpty: {
    color: Colors.textSecondary,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#4B4B57",
  },
  modalTextWrap: {
    flexShrink: 1,
    paddingRight: Spacing.md,
  },

  // Settings card
  settingsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 6,
    marginVertical: Spacing.lg,
  },
  settingsRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#4B4B57",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    minHeight: 56, // comfortable touch target
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  settingTextWrap: {
    marginLeft: 12,
    flexShrink: 1,
  },
  settingTitle: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  settingSubtitle: {
    marginTop: 2,
    fontFamily: TextStyles.caption?.fontFamily ?? TextStyles.body.fontFamily,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#4B4B57",
    marginLeft: Spacing.lg + 20, // indents divider under the icon
  },

  // Modal Styles
  modalIconContainer: {
    alignSelf: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  modalIconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#80703e",
    alignItems: "center",
    justifyContent: "center",
  },
  pointsBadge: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
});
