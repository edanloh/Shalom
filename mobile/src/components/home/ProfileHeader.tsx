import React from 'react';
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

// User interface matching the API structure

interface CombinedHeaderProps {
  user: User;
  hasNotifications?: boolean;
  onNotificationPress?: () => void;
}

const CombinedHeader: React.FC<CombinedHeaderProps> = ({
  user,
  hasNotifications = false,
  onNotificationPress,
}) => {
  const uri = getAvatarUri(user as any);
  const avatarSrc = uri ? { uri } : Images.profile;

  return (
    <View style={styles.container}>
      {/* Top Header with Points and Notification */}
      <View style={styles.topHeader}>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsIcon}>⭐</Text>
          <Text style={styles.pointsText}>{user.points || 0} pts</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.notificationButton} 
          onPress={onNotificationPress}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          {hasNotifications && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
      </View>

      {/* Welcome Section with Avatar */}
      <View style={styles.welcomeSection}>
        <View style={styles.avatarContainer}>
          <ImageWithFallback source={avatarSrc} fallback={Images.profile} style={styles.avatar} />
        </View>
        
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeText}>Welcome Back,</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.purple400,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  pointsIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  pointsText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 14,
    color: Colors.black,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 18,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default CombinedHeader;
