import React, { use, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import type { User } from '../../types';
import { getAvatarUri } from '@/utils/avatar';
import { Images } from '../../../assets';
import { ImageWithFallback } from '../common';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';

// User interface matching the API structure

interface CombinedHeaderProps {
  hasNotifications?: boolean;
  onNotificationPress?: () => void;
}

export default function CombinedHeader({ 
  hasNotifications = false,
  onNotificationPress,
}: CombinedHeaderProps) {

  const user = useUser().user;

  return (
    <View style={styles.container}>
      {/* Welcome Section with Avatar */}
      <LinearGradient
        colors={[Colors.purple850, Colors.secondary]}
        style={{height: Spacing.lg}}
      />
      <View style={styles.welcomeSection}>
        <View style={styles.avatarContainer}>
          <ImageWithFallback source={{uri: getAvatarUri()}} fallback={Images.profile} style={styles.avatar} />
        </View>
        
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeText}>Welcome Back,</Text>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: Spacing.lg,
    // paddingVertical: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.purple400,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  avatarContainer: {
    marginRight: Spacing.base,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
});
