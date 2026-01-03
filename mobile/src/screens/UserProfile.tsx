// src/screens/ProfileScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Text,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, ContainerStyles, Spacing, TextStyles } from '../constants';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import type { MainStackParamList, TabParamList } from '../types/navigation';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';
import { getAvatarUri } from '@/utils/avatar';
import { ActionButton, Screen } from "@/components";
import externalStyles from "@styles/styles";

type Nav = CompositeNavigationProp<
  StackNavigationProp<MainStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

const CARD_BG = '#3A3A45';
const TILE_BG = '#5B38E3';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Safe fallbacks so the UI renders even if some fields are missing
  const displayName = user?.name ?? 'User';
  const points = (user as any)?.points ?? 0;
  const avatarUri = getAvatarUri(user);
  const avatarSrc = avatarUri ? { uri: avatarUri } : Images.profile;

  const quickActions = useMemo(
    () => [
      { label: 'Point History', icon: 'trending-up-outline', action: () => navigation.navigate('PointsHistory') },
      { label: 'Learning Goal', icon: 'podium-outline', action: () => navigation.navigate('PointsHistory') },
      { label: 'Certificate', icon: 'ribbon-outline', action: () => navigation.navigate('PointsHistory') },
    ],
    []
  );

  const achievements = [
    { icon: 'medal-outline', label: 'Digital Literacy' },
    { icon: 'thumbs-up-outline', label: 'Review Master' },
    { icon: 'school-outline', label: 'Dedicated Learner' },
    { icon: 'checkmark-done-circle-outline', label: 'Knowledge Seeker' },
    { icon: 'play-circle-outline', label: 'Learning Champion' },
    { icon: 'trophy-outline', label: 'Perfect Scorer' },
  ];

  const accountItems = useMemo(
    () => [
      {
        icon: 'person-outline' as const,
        title: 'Edit Profile',
        subtitle: 'Update your personal information',
        onPress: () => navigation.navigate('EditProfile' as never),
      },
      {
        icon: 'shield-checkmark-outline' as const,
        title: 'Privacy & Security',
        subtitle: 'Manage your privacy settings',
        onPress: () => console.log('Navigate to Privacy & Security'),
      },
      {
        icon: 'lock-closed-outline' as const,
        title: 'Change Password',
        subtitle: 'Update your account password',
        onPress: () => console.log('Navigate to Change Password'),
      },
    ],
    [navigation]
  );

  return (
    <Screen
      title="Profile"
      navigation={navigation}
      headerRightIcon="settings-outline"
      onHeaderRightPress={() => navigation.navigate('Settings')}
    >
      <ScrollView
        contentContainerStyle={[externalStyles.fullScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & name */}
        <View style={[externalStyles.header, { marginBottom: 16 }]}>
          <View style={[externalStyles.logo, { marginBottom: 16 }]}>
            <ImageWithFallback source={avatarSrc} fallback={Images.profile} style={externalStyles.avatar} />
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
            {user?.authProvider && user?.authProvider == "google" && (
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
          <Text style={TextStyles.bodyMedium}>
            {points} points
          </Text>
        </View>

        {/* Quick actions (visual-only) */}
        <View style={styles.quickRow}>
          {quickActions.map((qa) => (
            // <View key={qa.label} style={styles.quickCard}>
            <Pressable 
              key={qa.label} 
              style={styles.quickCard} 
              onPress={() => {qa.action()}}
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
            onPress={() => {}}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.achievementsGrid}>
          {achievements.map((a) => (
            <View key={a.label} style={styles.achievementItem}>
              <Ionicons
                name={a.icon as any}
                size={26}
                color="#FACC15"
                style={styles.achievementIcon}
              />
              <Text style={styles.achievementLabel} numberOfLines={2}>
                {a.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Account Settings */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>
          Account Settings
        </Text>

        <View style={styles.settingsCard}>
          {accountItems.map((item, idx) => (
            <React.Fragment key={item.title}>
              <Pressable
                onPress={item.onPress}
                android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                  <View style={styles.settingTextWrap}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color={Colors.textSecondary} />
              </Pressable>

              {idx < accountItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Logout (active) */}
        <ActionButton
          text="Log Out"
          onPress={logout}
        />
        <View style={{ height: 120 }} />

      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickCard: {
    flex: 1,
    backgroundColor: TILE_BG,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  quickLabel: {
    marginTop: 8,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 13,
    color: Colors.white,
    fontWeight: '600',
  },

  // Achievements
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  viewAllText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: 13,
    color: '#C4B5FD',
    fontWeight: '600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
    marginBottom: Spacing.md,
    marginTop: 8,
  },
  achievementItem: {
    width: '30.5%', // 3 per row
    alignItems: 'center',
  },
  achievementIcon: {
    marginVertical: 8,
  },
  achievementLabel: {
    textAlign: 'center',
    fontFamily: TextStyles.caption?.fontFamily ?? TextStyles.body.fontFamily,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
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
    borderBottomColor: '#4B4B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    minHeight: 56, // comfortable touch target
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  settingSubtitle: {
    marginTop: 2,
    fontFamily: TextStyles.caption?.fontFamily ?? TextStyles.body.fontFamily,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#4B4B57',
    marginLeft: Spacing.lg + 20, // indents divider under the icon
  },
});

export default ProfileScreen;
