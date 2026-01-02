import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../constants';
import Screen from '../components/common/Screen';
import externalStyles from '../styles/styles';

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
    <Screen
      title="Settings"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      customEdges={["top", "bottom"]}
    >
      <>
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

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => {} },
                ])
              }
              android_ripple={{ color: 'rgba(239,68,68,0.12)' }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <View style={styles.rowTextWrap}>
                  <Text style={styles.dangerTitle}>Delete Account</Text>
                  <Text style={styles.rowSub}>Permanently delete your account and all data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Sections
  section: { marginTop: Spacing.base },
  sectionTitle: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    opacity: 0.9,
    fontWeight: '600',
    marginBottom: Spacing.lg,
  },

  // Cards
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Rows
  settingItem: {
    paddingHorizontal: Spacing.base,
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Left chunk
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
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

  // Danger
  dangerTitle: { ...TextStyles.body, color: '#ef4444', fontWeight: '700', marginBottom: 2 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 12 },
  rowTextWrap: { marginLeft: 12, flexShrink: 1 },
  rowSub: {
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
