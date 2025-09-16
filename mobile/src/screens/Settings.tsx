import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../constants';

export default function SettingsScreen({ navigation }: any) {
  const [settings, setSettings] = useState({
    courseUpdates: true,
    achievements: true,
    reminders: true,
    socialActivity: false,
    systemUpdates: true,
    emailNotifications: true,
    pushNotifications: true,
    darkMode: false,
    autoPlay: true,
    downloadOverWifi: true,
  });

  const notificationSettings = [
    { key: 'courseUpdates',   title: 'Course Updates',     subtitle: 'Get notified about new lessons and course updates', icon: 'play-circle-outline' },
    { key: 'achievements',    title: 'Achievements',       subtitle: 'Receive notifications for badges and milestones',   icon: 'trophy-outline' },
    { key: 'reminders',       title: 'Study Reminders',    subtitle: 'Daily reminders to continue your learning',         icon: 'time-outline' },
    { key: 'socialActivity',  title: 'Social Activity',    subtitle: 'Comments, replies, and forum activity',             icon: 'chatbubble-outline' },
    { key: 'systemUpdates',   title: 'System Updates',     subtitle: 'App updates and maintenance notifications',         icon: 'download-outline' },
  ];

  const generalSettings = [
    { key: 'emailNotifications', title: 'Email Notifications',  subtitle: 'Receive notifications via email',         icon: 'mail-outline' },
    { key: 'pushNotifications',  title: 'Push Notifications',   subtitle: 'Receive notifications on your device',    icon: 'notifications-outline' },
    { key: 'darkMode',           title: 'Dark Mode',            subtitle: 'Use dark theme throughout the app',       icon: 'moon-outline' },
    { key: 'autoPlay',           title: 'Auto-play Videos',     subtitle: 'Automatically play video lessons',        icon: 'play-outline' },
    { key: 'downloadOverWifi',   title: 'Download over WiFi only', subtitle: 'Only download content when connected to WiFi', icon: 'wifi-outline' },
  ];

  const accountItems = [
  {
    key: 'editProfile',
    icon: 'person-outline' as const,
    title: 'Edit Profile',
    subtitle: 'Update your personal information',
    onPress: () => navigation.navigate('EditProfile'),
  },
  {
    key: 'privacy',
    icon: 'shield-checkmark-outline' as const,
    title: 'Privacy & Security',
    subtitle: 'Manage your privacy settings',
    onPress: () => console.log('Privacy & Security'),
  },
  {
    key: 'changePassword',
    icon: 'lock-closed-outline' as const,
    title: 'Change Password',
    subtitle: 'Update your account password',
    onPress: () => console.log('Change Password'),
  },
];

const supportItems = [
  {
    key: 'help',
    icon: 'help-circle-outline' as const,
    title: 'Help & Support',
    subtitle: 'Get help and contact support',
    onPress: () => console.log('Help & Support'),
  },
  {
    key: 'terms',
    icon: 'document-text-outline' as const,
    title: 'Terms & Conditions',
    subtitle: 'Read our terms of service',
    onPress: () => console.log('Terms & Conditions'),
  },
  {
    key: 'about',
    icon: 'information-circle-outline' as const,
    title: 'About',
    subtitle: 'App version and information',
    onPress: () => console.log('About'),
  },
];


  const onToggle = (key: keyof typeof settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  const renderSettingItem = (item: any) => (
    <View key={item.key} style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>

      <View style={styles.switchWrap}>
        <Switch
          value={settings[item.key as keyof typeof settings]}
          onValueChange={() => onToggle(item.key as keyof typeof settings)}
          trackColor={{ false: '#3A3A44', true: Colors.purple400 }}
          thumbColor={
            settings[item.key as keyof typeof settings]
              ? (Platform.OS === 'android' ? '#ffffff' : '#f7f7f7')
              : (Platform.OS === 'android' ? '#bfbfc7' : '#e5e7eb')
          }
          ios_backgroundColor="#3A3A44"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconHitbox}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerIconHitbox} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <View style={styles.card}>
            {notificationSettings.map((item, idx) => (
              <View key={item.key}>
                {renderSettingItem(item)}
                {idx < notificationSettings.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            {generalSettings.map((item, idx) => (
              <View key={item.key}>
                {renderSettingItem(item)}
                {idx < generalSettings.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {accountItems.map((item, idx) => (
              <React.Fragment key={item.key}>
                <Pressable
                  onPress={item.onPress}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                    <View style={styles.settingText}>
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
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.card}>
            {supportItems.map((item, idx) => (
              <React.Fragment key={item.key}>
                <Pressable
                  onPress={item.onPress}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name={item.icon} size={20} color={Colors.textSecondary} />
                    <View style={styles.settingText}>
                      <Text style={styles.settingTitle}>{item.title}</Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={16} color={Colors.textSecondary} />
                </Pressable>

                {idx < supportItems.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.primary, // dark app background
  },
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    justifyContent: 'space-between',
  },
  headerIconHitbox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    fontSize: TextStyles.h4.fontSize,
    fontWeight: 'bold',
  },

  // Sections
  section: { marginTop: Spacing.lg },
  sectionTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    opacity: 0.9,
    fontWeight: '600',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Cards
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#2B2E36',
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Rows
  settingItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchWrap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: Spacing.lg + 28, // indent under the icon
  },

  // Left chunk
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingText: { marginLeft: 16, flex: 1 },

  // Typography
  settingTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  // Footer
  version: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    fontSize: 12,
  },
});
