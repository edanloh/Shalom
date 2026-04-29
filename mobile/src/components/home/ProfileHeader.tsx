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
import type { ShopItem } from '@/services/creditService';
import { bannerPaletteFor, frameStyleFor, titleBadgeStyleFor } from '@/utils/cosmetics';

interface CombinedHeaderProps {
  balance?: number;
  equippedTitle?: Partial<Pick<ShopItem, 'icon' | 'name' | 'color' | 'rarity'>> | null;
  equippedFrame?: Partial<Pick<ShopItem, 'name' | 'color'>> | null;
  equippedBanner?: Partial<Pick<ShopItem, 'name' | 'color'>> | null;
  onCreditsPress?: () => void;
}

export default function CombinedHeader({ 
  balance = 0,
  equippedTitle = null,
  equippedFrame = null,
  equippedBanner = null,
  onCreditsPress,
}: CombinedHeaderProps) {
  const user = useUser().user;
  const formattedBalance = balance.toLocaleString();
  const frameStyle = frameStyleFor(equippedFrame);
  const titleStyle = titleBadgeStyleFor(equippedTitle);

  return (
    <LinearGradient
      colors={bannerPaletteFor(equippedBanner)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.welcomeSection}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarRing, equippedFrame ? frameStyle.outer : null]}>
            <ImageWithFallback
              source={{uri: getAvatarUri()}}
              fallback={Images.profile}
              style={[styles.avatar, equippedFrame ? frameStyle.inner : null]}
            />
          </View>
        </View>
        
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.welcomeText}>Welcome Back,</Text>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          {equippedTitle ? (
            <View style={[styles.titleBadge, titleStyle.badge]}>
              <Text style={[styles.titleBadgeText, titleStyle.text]}>
                {equippedTitle.icon ? `${equippedTitle.icon} ` : ""}{equippedTitle.name ?? "Learner"}
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

        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
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
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
