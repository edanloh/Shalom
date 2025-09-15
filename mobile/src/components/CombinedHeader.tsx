import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing } from '../constants';

// User interface matching the API structure
interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
  email: string;
  joinedAt: string;
}

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
  return (
    <View style={styles.container}>
      {/* Top Header with Points and Notification */}
      <View style={styles.topHeader}>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsIcon}>⭐</Text>
          <Text style={styles.pointsText}>{user.points} pts</Text>
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
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
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
    fontFamily: 'PlusJakartaSans-SemiBold',
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
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
});

export default CombinedHeader;
