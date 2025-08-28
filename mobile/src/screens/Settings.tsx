import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    {
      key: 'courseUpdates',
      title: 'Course Updates',
      subtitle: 'Get notified about new lessons and course updates',
      icon: 'play-circle-outline',
    },
    {
      key: 'achievements',
      title: 'Achievements',
      subtitle: 'Receive notifications for badges and milestones',
      icon: 'trophy-outline',
    },
    {
      key: 'reminders',
      title: 'Study Reminders',
      subtitle: 'Daily reminders to continue your learning',
      icon: 'time-outline',
    },
    {
      key: 'socialActivity',
      title: 'Social Activity',
      subtitle: 'Comments, replies, and forum activity',
      icon: 'chatbubble-outline',
    },
    {
      key: 'systemUpdates',
      title: 'System Updates',
      subtitle: 'App updates and maintenance notifications',
      icon: 'download-outline',
    },
  ];

  const generalSettings = [
    {
      key: 'emailNotifications',
      title: 'Email Notifications',
      subtitle: 'Receive notifications via email',
      icon: 'mail-outline',
    },
    {
      key: 'pushNotifications',
      title: 'Push Notifications',
      subtitle: 'Receive notifications on your device',
      icon: 'notifications-outline',
    },
    {
      key: 'darkMode',
      title: 'Dark Mode',
      subtitle: 'Use dark theme throughout the app',
      icon: 'moon-outline',
    },
    {
      key: 'autoPlay',
      title: 'Auto-play Videos',
      subtitle: 'Automatically play video lessons',
      icon: 'play-outline',
    },
    {
      key: 'downloadOverWifi',
      title: 'Download over WiFi only',
      subtitle: 'Only download content when connected to WiFi',
      icon: 'wifi-outline',
    },
  ];

  const renderSettingItem = (item: any, category: string) => (
    <View key={item.key} style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={item.icon as any} size={20} color="#6b7280" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Switch
        value={settings[item.key as keyof typeof settings]}
        onValueChange={(value) => setSettings({ ...settings, [item.key]: value })}
        trackColor={{ false: '#e5e7eb', true: '#8B5CF6' }}
        thumbColor={settings[item.key as keyof typeof settings] ? '#fff' : '#f3f4f6'}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <View style={styles.settingsCard}>
          {notificationSettings.map((item) => renderSettingItem(item, 'notification'))}
        </View>
      </View>

      {/* General Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.settingsCard}>
          {generalSettings.map((item) => renderSettingItem(item, 'general'))}
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingSubtitle}>Update your personal information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Privacy & Security</Text>
                <Text style={styles.settingSubtitle}>Manage your privacy settings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingSubtitle}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Support & Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Help & Support</Text>
                <Text style={styles.settingSubtitle}>Get help and contact support</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Terms & Conditions</Text>
                <Text style={styles.settingSubtitle}>Read our terms of service</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>About</Text>
                <Text style={styles.settingSubtitle}>App version and information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  placeholder: { width: 40 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginHorizontal: 20, marginBottom: 8 },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingText: { marginLeft: 16, flex: 1 },
  settingTitle: { fontSize: 16, color: '#1f2937', marginBottom: 2 },
  settingSubtitle: { fontSize: 14, color: '#6b7280' },
  version: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20, marginBottom: 40 },
});