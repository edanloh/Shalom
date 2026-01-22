import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import * as Notifications from "expo-notifications";
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../constants';
import Screen from '../components/common/Screen';
import CustomModal from "../components/common/CustomModal";
import externalStyles from '../styles/styles';

export default function SettingsScreen({ navigation }: any) {
  const { expoPushToken, reloadNotifications, requestAndRegisterPushToken } =
    useNotification();
  const [settings, setSettings] = useState({
    courseUpdates: true,
    achievements: true,
    reminders: true,
    socialActivity: false,
    systemUpdates: true,
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    autoPlay: true,
    downloadOverWifi: true,
  });

  const [activeModal, setActiveModal] = useState<
    "help" | "terms" | "about" | null
  >(null);

  // Check notification permission status on mount
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setSettings((s) => ({ ...s, pushNotifications: status === "granted" }));
  };

  const handlePushNotificationToggle = async () => {
    const { status: currentStatus } = await Notifications.getPermissionsAsync();

    if (currentStatus === "granted") {
      // User wants to turn off - direct them to settings
      Alert.alert(
        "Disable Notifications",
        "To disable notifications, please go to your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    } else {
      // Request permission
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
      setSettings((s) => ({
        ...s,
        pushNotifications: newStatus === "granted",
      }));

      if (newStatus === 'granted') {
        // Immediately trigger push token registration
        if (typeof requestAndRegisterPushToken === 'function') {
          requestAndRegisterPushToken();
        }
        // Optionally, you can also show a toast or feedback here
      } else {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings to receive updates.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    }
  };

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
      onPress: () => navigation.navigate('ChangePassword'),
    },
  ];

  const supportItems = [
    {
      key: 'help',
      icon: 'help-circle-outline' as const,
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
    onPress: () => setActiveModal("help"),
    },
    {
      key: 'terms',
      icon: 'document-text-outline' as const,
      title: 'Terms & Conditions',
      subtitle: 'Read our terms of service',
    onPress: () => setActiveModal("terms"),
    },
    {
      key: 'about',
      icon: 'information-circle-outline' as const,
      title: 'About',
      subtitle: 'App version and information',
    onPress: () => setActiveModal("about"),
    },
  ];

  const onToggle = (key: keyof typeof settings) => {
    if (key === "pushNotifications") {
      handlePushNotificationToggle();
    } else {
      setSettings((s) => ({ ...s, [key]: !s[key] }));
    }
  };

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
      stickyHeader
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

        {/* Help & Support Modal */}
        <CustomModal
          visible={activeModal === "help"}
          onClose={() => setActiveModal(null)}
        >
          <View>
            <View style={styles.modalHeader}>
              <Ionicons name="help-circle" size={32} color={Colors.white} />
              <Text style={TextStyles.h3}>Help & Support</Text>
            </View>
            <Text style={TextStyles.caption}>
              Need assistance? We're here to help!
            </Text>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>Contact Us:</Text>
              <Text style={TextStyles.caption}>
                • Email: @gmail.com
              </Text>
              <Text style={TextStyles.caption}>• Phone: +65</Text>
              <Text style={TextStyles.caption}>
                • Hours: Mon-Fri, 9am-6pm
              </Text>
            </View>
          </View>
        </CustomModal>

        {/* Terms & Conditions Modal */}
        <CustomModal
          visible={activeModal === "terms"}
          onClose={() => setActiveModal(null)}
        >
          <View>
            <View style={styles.modalHeader}>
              <Ionicons
                name="document-text"
                size={32}
                color={Colors.white}
              />
              <Text style={TextStyles.h3}>Terms & Conditions</Text>
            </View>
            <Text style={TextStyles.caption}>
              Last updated: January 6, 2026
            </Text>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>1. Acceptance of Terms</Text>
              <Text style={TextStyles.caption}>
                By accessing and using this app, you accept and agree to be
                bound by the terms and provision of this agreement.
              </Text>
            </View>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>2. Use License</Text>
              <Text style={TextStyles.caption}>
                Permission is granted to temporarily access the materials for
                personal, non-commercial use only.
              </Text>
            </View>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>
                3. User Responsibilities
              </Text>
              <Text style={TextStyles.caption}>
                You are responsible for maintaining the confidentiality of your
                account and password.
              </Text>
            </View>
            <Text
              style={[
                TextStyles.captionSmall,
                { marginTop: Spacing.lg, fontStyle: "italic" },
              ]}
            >
              For full terms and conditions, please visit our website.
            </Text>
          </View>
        </CustomModal>

        {/* About Modal */}
        <CustomModal
          visible={activeModal === "about"}
          onClose={() => setActiveModal(null)}
        >
          <View>
            <View style={styles.modalHeader}>
              <Ionicons
                name="information-circle"
                size={32}
                color={Colors.white}
              />
              <Text style={TextStyles.h3}>About</Text>
            </View>
            <Text style={TextStyles.caption}>Version 1.0.0</Text>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>Mission</Text>
              <Text style={TextStyles.caption}>
                ---
              </Text>
            </View>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>Features</Text>
              <Text style={TextStyles.caption}>
                • Interactive video courses
              </Text>
              <Text style={TextStyles.caption}>
                • Progress tracking & analytics
              </Text>
              <Text style={TextStyles.caption}>
                • Certificates of completion
              </Text>
              <Text style={TextStyles.caption}>• Community discussions</Text>
            </View>
            <View style={{ marginTop: Spacing.lg }}>
              <Text style={TextStyles.bodyMedium}>Credits</Text>
              <Text style={TextStyles.caption}>
                Shalom. All rights reserved.
              </Text>
            </View>
          </View>
        </CustomModal>
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
  // Modal styles
  modalHeader: {
    flexDirection: "row",
    gap: 12,
  }
});
