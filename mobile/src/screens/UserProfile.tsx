import React, { useMemo, useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  Platform,
} from "react-native";
import { Colors, Spacing, TextStyles } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { ImageWithFallback } from "../components/common";
import { Images } from "../../assets";
import { getAvatarUri } from "@/utils/avatar";
import { ActionButton, Screen } from "@/components";
import externalStyles from "@styles/styles";
import CustomModal from "../components/common/CustomModal";
import creditService from "../services/creditService";
import { showToast } from "@/components/common/Toast";
import { AchievementItem, CreditEvent } from "../types";
import { useUser } from "@/contexts/UserContext";
import { ShopItem } from "@/services/creditService";
import { LinearGradient } from "expo-linear-gradient";
import { bannerPaletteFor, frameStyleFor, titleBadgeStyleFor } from "@/utils/cosmetics";

const CARD_BG = "#3A3A45";
const TILE_BG = "#5B38E3";

type Achievement = {
  icon: string;
  label: string;
  description?: string;
  earnedOn?: string;
  points?: number;
};

const isIconUrl = (value?: string) =>
  !!value && (value.startsWith("http://") || value.startsWith("https://"));

export default function ProfileScreen({ navigation }: any) {
  const { user } = useUser();
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [balance, setBalance] = useState<number>((user as any)?.points ?? 0);
  const [creditHistory, setCreditHistory] = useState<CreditEvent[]>([]);
  const [achievementsData, setAchievementsData] = useState<AchievementItem[]>([]);
  const [equippedTitle, setEquippedTitle] = useState<ShopItem | null>(null);
  const [equippedAvatarFrame, setEquippedAvatarFrame] = useState<ShopItem | null>(null);
  const [equippedBanner, setEquippedBanner] = useState<ShopItem | null>(null);
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const lastScrollY = useRef(0);
  const tabHidden = useRef(false);

  // Safe fallbacks so the UI renders even if some fields are missing
  const displayName = user?.name ?? "User";
  const frameStyle = frameStyleFor(equippedAvatarFrame);
  const titleStyle = titleBadgeStyleFor(equippedTitle);

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
      const uid = user?.uuid;
      if (!uid) {
        setBalance(0);
        setAchievementsData([]);
        setCreditHistory([]);
        setEquippedTitle(null);
        setEquippedAvatarFrame(null);
        setEquippedBanner(null);
        return;
      }
      const [bal, ach, hist, shop] = await Promise.all([
        creditService.getCreditBalance(uid).catch(() => null),
        creditService.getAchievements(uid).catch(() => []),
        creditService.getCreditHistory(uid).catch(() => []),
        creditService.getShopItems(uid).catch(() => ({ items: [], balance: 0 })),
      ]);
      if (bal?.balance != null) setBalance(bal.balance);

      const iconFor = (a: any) => {
        const byType: Record<string, string> = {
          badge: "trophy-outline",
          streak: "flame",
          certificate: "ribbon-outline",
          level: "ribbon-outline",
        };
        if (isIconUrl(a.icon)) return a.icon;
        return byType[a.type] || byType[a.icon] || a.icon || "trophy-outline";
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
      setEquippedTitle((shop.items ?? []).find((item) => item.type === 'title' && item.isEquipped) ?? null);
      setEquippedAvatarFrame((shop.items ?? []).find((item) => item.type === 'avatar_frame' && item.isEquipped) ?? null);
      setEquippedBanner((shop.items ?? []).find((item) => item.type === 'profile_banner' && item.isEquipped) ?? null);
    } catch (err) {
      console.warn("Profile: failed to load credits/achievements", err);
      showToast({
        title: "Credits unavailable",
        message: "Could not refresh credits right now.",
        type: "error",
      });
    }
  }, [user?.uuid]);

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
    const unsub = creditService.subscribeToCreditUpdates(loadCredits);
    return () => {
      if (unsub) unsub();
    };
  }, [loadCredits]);

  // Reload equipped items whenever the user navigates to this tab
  useFocusEffect(
    React.useCallback(() => {
      loadCredits();
    }, [loadCredits])
  );

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
      }
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
          <View
            style={[
              externalStyles.header,
              styles.profileHero,
              equippedBanner ? { borderColor: equippedBanner.color } : null,
              { marginBottom: 16 },
            ]}
          >
            <LinearGradient
              colors={bannerPaletteFor(equippedBanner)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.profileHeroBanner}
            />
            <Pressable
              style={[externalStyles.logo, styles.profileAvatarPressable]}
              onPress={() => setShowAvatarModal(true)}
              accessibilityLabel="View profile picture"
              accessibilityRole="imagebutton"
            >
              <View style={[styles.profileAvatarRing, equippedAvatarFrame ? frameStyle.outer : null]}>
                <ImageWithFallback
                  source={{ uri: getAvatarUri() }}
                  fallback={Images.profile}
                  style={[
                    externalStyles.avatar,
                    equippedAvatarFrame ? frameStyle.inner : null,
                  ]}
                />
              </View>
              {user?.auth_provider && user?.auth_provider == "google" && (
                <Image
                  source={require("@assets/google.png")}
                  style={styles.avatarGoogleIcon}
                />
              )}
            </Pressable>
              {/* Avatar Modal */}
              <CustomModal
                visible={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
              >
                <View style={{ alignItems: "center", justifyContent: "center"}}>
                  <View style={[styles.modalAvatarRing, equippedAvatarFrame ? frameStyle.outer : null]}>
                    <ImageWithFallback
                      source={{ uri: getAvatarUri() }}
                      fallback={Images.profile}
                      style={[
                        styles.modalAvatarImage,
                        equippedAvatarFrame ? frameStyle.inner : null,
                      ]}
                    />
                  </View>
                  <Text style={[TextStyles.h3, { textAlign: "center", color: Colors.textSecondary }]}>{displayName}</Text>
                </View>
              </CustomModal>
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
            </View>
            {equippedTitle ? (
              <View style={[styles.titleBadge, titleStyle.badge]}>
                <Text style={[styles.titleBadgeText, titleStyle.text]}>
                  {equippedTitle.icon} {equippedTitle.name}
                </Text>
              </View>
            ) : null}
            {/* Points badge — inside the card, anchored to top-right of banner */}
            <View style={styles.balanceBadge} pointerEvents="none">
              <Ionicons name="star" size={13} color="#FFD700" />
              <Text style={styles.balanceText}>{balance.toLocaleString()} pts</Text>
            </View>
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
             {isIconUrl(a.icon) ? (
               <Image
                 source={{ uri: a.icon }}
                 style={styles.achievementIconImage}
                 resizeMode="cover"
               />
             ) : (
               <Ionicons
                 name={a.icon as any}
                 size={26}
                 color="#FACC15"
                 style={styles.achievementIcon}
               />
             )}
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
            {isIconUrl(selectedAchievement?.icon) ? (
              <Image
                source={{ uri: selectedAchievement?.icon }}
                style={styles.modalIconImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name={selectedAchievement?.icon as any}
                size={64}
                color={Colors.yellow}
              />
            )}
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
  profileHero: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 20,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    overflow: "hidden",
  },
  profileHeroBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  balanceBadge: {
    position: "absolute",
    top: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  balanceText: {
    fontFamily: TextStyles.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  profileAvatarPressable: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalAvatarRing: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  modalAvatarImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  titleBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  titleBadgeText: {
    ...TextStyles.caption,
    color: Colors.white,
    fontWeight: "700",
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
  achievementIconImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    ...TextStyles.body,
    textAlign: "center",
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
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
  modalIconImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarGoogleIcon: {
    position: "absolute",
    bottom: 2,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: Platform.OS === "web" ? 3 : 0,
    borderColor: Colors.white,
    outlineWidth: 3,
    outlineColor: Colors.white,
  },
});
