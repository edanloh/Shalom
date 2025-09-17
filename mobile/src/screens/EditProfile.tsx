// src/screens/EditProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    phone: user?.phone || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800)); // simulate API
      await updateProfile({
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        location: formData.location,
        phone: formData.phone,
      });
      Alert.alert('Success', 'Profile updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAvatar = () => {
    Alert.alert('Change Avatar', 'Choose an option', [
      { text: 'Take Photo', onPress: () => {} },
      { text: 'Choose from Gallery', onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Header (centered title, back on left, Save on right) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconHitbox}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isLoading}
          style={[styles.headerAction, isLoading && { opacity: 0.7 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerActionText}>{isLoading ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                user?.avatar
                  ? { uri: user.avatar }
                  : require('@assets/profile.png')
              }
              style={styles.avatar}
            />
            <Pressable style={styles.avatarEditButton} onPress={handleChangeAvatar}>
              <Ionicons name="camera" size={16} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.avatarText}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bio</Text>
            <View style={[styles.inputRow, { alignItems: 'flex-start', paddingVertical: 12 }]}>
              <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder="Tell us about yourself"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
                placeholder="Enter your location"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                placeholder="Enter your phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_BG = '#2B2E36';
const BORDER = '#4B4B57';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

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
  headerAction: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.purple400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    ...TextStyles.body,
    color: Colors.white,
    fontWeight: '700',
  },

  container: { flex: 1, backgroundColor: Colors.primary },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#E5E7EB' },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.purple400,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  // Form
  form: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  inputGroup: { marginBottom: Spacing.lg },
  inputLabel: {
    ...TextStyles.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontFamily: TextStyles.body.fontFamily,
    fontSize: TextStyles.body.fontSize,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 92 },

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
