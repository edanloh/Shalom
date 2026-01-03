import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useCourses } from '../contexts/CourseContext';
import type { MainStackParamList } from '../types';
import { Colors, Typography, Spacing, TextStyles } from '../constants';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';
import Screen from '../components/common/Screen';
import { ActionButton } from '@/components';

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
      <Screen
        title="Wishlist"
        navigation={navigation}
        headerLeftIcon="chevron-back"
      >
        <View style={[styles.centerContainer, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={[TextStyles.body, {paddingTop: Spacing.md}]}>Loading your favourites…</Text>
        </View>
      </Screen>
    );
  }

  // Error state (no list yet)
  if (wishlistError && (!wishlist || wishlist.length === 0)) {
    return (
      <Screen
        title="Wishlist"
        navigation={navigation}
        headerLeftIcon="chevron-back"
      >
        <View>
          <Text style={styles.errorMessage}>Error: {wishlistError}</Text>
          <ActionButton
            text="Retry"
            onPress={refreshWishlist}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Wishlist"
      navigation={navigation}
      headerLeftIcon="chevron-back"
    >
      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        refreshing={!!wishlistLoading}
        onRefresh={refreshWishlist}
        ListEmptyComponent={
          <View style={{gap: Spacing.base, alignItems: 'center' }}>
            <Text style={TextStyles.body}>Your wishlist is empty</Text>
            <Text style={TextStyles.caption}>Tap the heart on any course to save it here.</Text>
            <ActionButton
              text="Browse courses"
              onPress={() => navigation.navigate('MyCourses')}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMessage: {
    ...TextStyles.body,
    color: Colors.red,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardDark,
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
