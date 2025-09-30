import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useCourses } from '../contexts/CourseContext';
import type { MainStackParamList } from '../types';
import { Colors, Typography, Spacing, TextStyles, BorderRadius } from '../constants';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';

const CARD_RADIUS = 16;

const MetaRow = ({ rating, modules }: { rating: number; modules?: number }) => (
  <View style={styles.metaRow}>
    <Ionicons name="star" size={12} color="#FACC15" />
    <Text style={styles.metaText}>{rating?.toFixed?.(1) ?? rating}</Text>
    <Text style={styles.metaDot}>•</Text>
    <Text style={styles.metaText}>{modules ?? 12} modules</Text>
  </View>
);

export default function WishlistScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const {
    wishlist,
    wishlistLoading,
    wishlistError,
    refreshWishlist,
    toggleWishlist,
  } = useCourses();

  const goToCoursesTab = () => {
    (navigation as any).navigate('Main', { screen: 'Courses' });
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
      style={styles.card}
    >
      {/* Left: text */}
      <View style={styles.cardLeft}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <MetaRow rating={item.rating} modules={item.modules} />
      </View>

      {/* Right: image + heart */}
      <View style={styles.cardRight}>
        <ImageWithFallback
          source={{ uri: item.image }}
          fallback={Images.coursePlaceholder}
          style={styles.cardImage}
        />
        <View style={styles.badgeRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{item.level}</Text>
          </View>

          <TouchableOpacity
            onPress={() => toggleWishlist(item)}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            style={styles.heartBtn}
            accessibilityRole="button"
            accessibilityLabel="Remove from wishlist"
          >
            <Ionicons name="heart" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading state (no list yet)
  if (wishlistLoading && (!wishlist || wishlist.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wishlist</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.purple400} />
          <Text style={styles.loadingMessage}>Loading your favourites…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state (no list yet)
  if (wishlistError && (!wishlist || wishlist.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
            <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wishlist</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorMessage}>Error: {wishlistError}</Text>
          <TouchableOpacity onPress={refreshWishlist} style={styles.ctaButton}>
            <Text style={styles.ctaText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header (outside the list) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl * 1.5 }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshing={!!wishlistLoading}
        onRefresh={refreshWishlist}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyMessage}>Your wishlist is empty</Text>
            <Text style={styles.emptySubMessage}>Tap the heart on any course to save it here.</Text>
            <TouchableOpacity onPress={goToCoursesTab} style={[styles.ctaButton, { marginTop: Spacing.md }]}>
              <Text style={styles.ctaText}>Browse courses</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },

  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    minHeight: 220,
  },
  loadingMessage: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.red,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyMessage: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptySubMessage: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  ctaButton: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  ctaText: { ...TextStyles.body, color: Colors.white, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.gray600,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardLeft: { flex: 1, padding: Spacing.md },
    leftTitle: {
    fontFamily: TextStyles.h4.fontFamily,
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    marginBottom: Spacing.xs,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardSubtitle: { ...TextStyles.body, color: Colors.textSecondary, fontSize: 13 },
  title: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: Typography?.fontFamily?.semiBold ?? TextStyles.body.fontFamily,
    marginBottom: 4,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },

  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Typography?.fontFamily?.regular ?? TextStyles.body.fontFamily,
  },

  metaDot: { color: Colors.textSecondary, marginHorizontal: 4 },

  cardRight: {
    width: 150,
    height: 100, 
    backgroundColor: '#E7F0EC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  badgeRow: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  levelBadge: {
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  levelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
  },
  heartBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 6,
  },
});
