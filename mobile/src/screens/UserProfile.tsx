// src/screens/ProfileScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Text,
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
      { label: 'Point History', icon: 'trending-up-outline' },
      { label: 'Learning Goal', icon: 'podium-outline' },
      { label: 'Certificate', icon: 'ribbon-outline' },
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Top bar (no back button) */}
      <View style={styles.topBar}>
        <View style={styles.iconSpacer} />
        <Text style={styles.topTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.iconBtn}
        >
          <Ionicons name="settings-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & name */}
        <View style={styles.centerHeader}>
          <ImageWithFallback source={avatarSrc} fallback={Images.profile} style={styles.avatar} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.points}>{points} points</Text>
        </View>

        {/* Quick actions (visual-only) */}
        <View style={styles.quickRow}>
          {quickActions.map((qa) => (
            <View key={qa.label} style={styles.quickCard}>
              <Ionicons name={qa.icon as any} size={22} color={Colors.white} />
              <Text style={styles.quickLabel}>{qa.label}</Text>
            </View>
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
        <Text style={[styles.sectionTitle, { marginTop: Spacing.md, paddingHorizontal: Spacing.lg }]}>
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
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.9}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...ContainerStyles.screen,
    backgroundColor: Colors.primary,
  },
  scrollView: { flex: 1 },

  // Top bar
  topBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconSpacer: { width: 36, height: 36 }, // keeps title centered
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: TextStyles.h4.fontFamily,
    fontSize: TextStyles.h4.fontSize,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },

  // Header
  centerHeader: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  name: {
    marginTop: Spacing.sm,
    fontFamily: TextStyles.h3.fontFamily,
    fontSize: TextStyles.h3.fontSize,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  points: {
    marginTop: 4,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textSecondary,
  },

  // Quick actions
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.lg,
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
    paddingHorizontal: Spacing.lg,
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
    paddingHorizontal: Spacing.lg,
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
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    paddingVertical: 6,
    marginTop: Spacing.md,
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

  // Logout
  logoutBtn: {
    backgroundColor: Colors.purple400,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.white,
    fontWeight: '700',
  },
});

export default ProfileScreen;
