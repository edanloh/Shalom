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

export default function NotificationSettingsScreen({ navigation }: any) {
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
    { key: 'newContent',            title: 'New Content',             subtitle: 'Receive notifications when new course content is available', icon: 'notifications-outline' },
    { key: 'deadlines',             title: 'Deadlines',               subtitle: 'Get reminders for upcoming assignment deadlines',            icon: 'alarm-outline' },
    { key: 'messages',              title: 'Messages',                subtitle: 'Receive messages from instructors or peers',                 icon: 'chatbubble-outline' },
    { key: 'progressUpdates',       title: 'Progress Updates',        subtitle: 'Get updates on course progress and achievements',            icon: 'trending-up-outline' },
    { key: 'courseRecommendations', title: 'Course Recommendations',  subtitle: 'Receive notifications about new courses and recommendations',icon: 'bulb-outline' },
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
      title="Notification Settings"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      customEdges={["top", "bottom"]}
    >
      <>
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            {notificationSettings.map((item, idx) => (
              <View key={item.key}>
                {renderSettingItem(item)}
                {idx < notificationSettings.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
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
