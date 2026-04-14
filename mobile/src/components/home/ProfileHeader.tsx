import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { getAvatarUri } from '@/utils/avatar';
import { Images } from '../../../assets';
import { ImageWithFallback } from '../common';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@/contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

interface CombinedHeaderProps {
  balance?: number;
  equippedTitle?: {
    icon: string;
    name: string;
  } | null;
  avatarFrameColor?: string | null;
  bannerAccentColor?: string | null;
  onCreditsPress?: () => void;
  hasNotifications?: boolean;
  onNotificationPress?: () => void;
}

export default function CombinedHeader({ 
  balance = 0,
  equippedTitle = null,
  avatarFrameColor = null,
  bannerAccentColor = null,
  onCreditsPress,
  hasNotifications = false,
  onNotificationPress,
}: CombinedHeaderProps) {
  const user = useUser().user;
  const formattedBalance = balance.toLocaleString();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.purple850, bannerAccentColor || Colors.secondary]}
        style={{height: Spacing.lg}}
      />
      <View style={styles.welcomeSection}>
        <View style={styles.avatarContainer}>
          <ImageWithFallback
            source={{uri: getAvatarUri()}}
            fallback={Images.profile}
            style={[styles.avatar, avatarFrameColor ? { borderColor: avatarFrameColor } : null]}
          />
        </View>
        
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeText}>Welcome Back,</Text>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          {equippedTitle ? (
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>
                {equippedTitle.icon} {equippedTitle.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCreditsPress}
            style={styles.creditsPill}
            accessibilityRole="button"
            accessibilityLabel={`View ${formattedBalance} credits`}
          >
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.creditsText}>{formattedBalance}</Text>
          </TouchableOpacity>

          {hasNotifications && onNotificationPress ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onNotificationPress}
              style={styles.notificationButton}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : null}
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
  titleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  titleBadgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.white,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.base,
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  creditsText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 14,
    color: Colors.white,
    marginLeft: 6,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
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
    marginBottom: 4,
  },
});
