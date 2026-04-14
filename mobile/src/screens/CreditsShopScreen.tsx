import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles, BorderRadius } from '../constants';
import Screen from '../components/common/Screen';
import creditService, { ShopItem } from '../services/creditService';
import { useUser } from '../contexts/UserContext';
import { showToast } from '../components/common/Toast';

type ShopFilter = 'all' | 'owned' | 'affordable' | 'limited';
type ShopCategory = 'all' | string;

const TYPE_META: Record<string, { label: string; itemLabel: string; icon: string }> = {
  title: { label: 'Titles', itemLabel: 'title', icon: 'ribbon-outline' },
  avatar_frame: { label: 'Frames', itemLabel: 'frame', icon: 'ellipse-outline' },
  profile_banner: { label: 'Banners', itemLabel: 'banner', icon: 'image-outline' },
  achievement_showcase: { label: 'Showcase', itemLabel: 'showcase', icon: 'trophy-outline' },
  reaction_pack: { label: 'Reactions', itemLabel: 'reaction pack', icon: 'chatbubble-ellipses-outline' },
  celebration_effect: { label: 'Effects', itemLabel: 'effect', icon: 'sparkles-outline' },
};

const FILTER_META: Array<{ key: ShopFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'owned', label: 'Owned' },
  { key: 'affordable', label: 'Affordable' },
  { key: 'limited', label: 'Limited' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#94A3B8',
  rare: '#38BDF8',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

const getTypeMeta = (type: string) =>
  TYPE_META[type] ?? { label: type.replace(/_/g, ' '), itemLabel: type.replace(/_/g, ' '), icon: 'cube-outline' };

const formatRarity = (rarity?: string) => {
  if (!rarity) return 'Common';
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
};

export default function CreditsShopScreen({ navigation }: any) {
  const { user } = useUser();
  const userId = user?.uuid;

  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('all');
  const [selectedFilter, setSelectedFilter] = useState<ShopFilter>('all');
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) {
      setItems([]);
      setBalance(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await creditService.getShopItems(userId);
      setItems(result.items);
      setBalance(result.balance);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(items.map((item) => item.type)));
    return ['all', ...dynamic] as ShopCategory[];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== 'all' && item.type !== selectedCategory) return false;
      if (selectedFilter === 'owned' && !item.isUnlocked) return false;
      if (selectedFilter === 'affordable' && !item.canAfford && !item.isUnlocked) return false;
      if (selectedFilter === 'limited' && !item.isLimited) return false;
      return true;
    });
  }, [items, selectedCategory, selectedFilter]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedPreviewId(null);
      return;
    }
    const current = items.find((item) => item.id === selectedPreviewId);
    if (!current) {
      const nextPreview =
        items.find((item) => item.isFeatured) ??
        items.find((item) => item.isEquipped) ??
        items[0];
      setSelectedPreviewId(nextPreview?.id ?? null);
    }
  }, [items, selectedPreviewId]);

  const selectedPreviewItem = useMemo(() => {
    return (
      items.find((item) => item.id === selectedPreviewId) ??
      filteredItems[0] ??
      items[0] ??
      null
    );
  }, [filteredItems, items, selectedPreviewId]);

  const previewByType = useMemo(() => {
    const map = new Map<string, ShopItem>();
    items.forEach((item) => {
      if (item.isEquipped) map.set(item.type, item);
    });
    if (selectedPreviewItem) map.set(selectedPreviewItem.type, selectedPreviewItem);
    return map;
  }, [items, selectedPreviewItem]);

  const previewTitle = previewByType.get('title');
  const previewFrame = previewByType.get('avatar_frame');
  const previewBanner = previewByType.get('profile_banner');
  const previewShowcase = previewByType.get('achievement_showcase');
  const previewReaction = previewByType.get('reaction_pack');
  const previewEffect = previewByType.get('celebration_effect');

  const ownedCount = useMemo(() => items.filter((item) => item.isUnlocked).length, [items]);
  const affordableCount = useMemo(
    () => items.filter((item) => item.canAfford && !item.isUnlocked).length,
    [items]
  );
  const collectionCount = useMemo(() => {
    const collections = new Set(items.map((item) => item.collection).filter(Boolean));
    return collections.size;
  }, [items]);
  const recentUnlocks = useMemo(() => {
    return [...items]
      .filter((item) => item.isUnlocked && item.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime())
      .slice(0, 3);
  }, [items]);
  const featuredItem = useMemo(() => {
    return (
      filteredItems.find((item) => item.isFeatured) ??
      filteredItems.find((item) => item.isLimited) ??
      filteredItems[0] ??
      null
    );
  }, [filteredItems]);

  const handlePurchase = (item: ShopItem) => {
    const itemLabel = getTypeMeta(item.type).itemLabel;
    Alert.alert(
      `Unlock "${item.name}"`,
      `Spend ${item.cost} credits to unlock this ${itemLabel || 'item'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            setPurchasing(item.id);
            try {
              const result = await creditService.purchaseShopItem(userId!, item.id);
              // Fall back to current balance if server omits newBalance (defensive)
              const nextBalance = result.newBalance ?? (balance - item.cost);
              setBalance(Math.max(0, nextBalance));
              setItems((prev) =>
                prev.map((i) => {
                  const updated =
                    i.id === item.id
                      ? {
                          ...i,
                          isUnlocked: true,
                          unlockedAt: new Date().toISOString(),
                        }
                      : i;
                  return {
                    ...updated,
                    canAfford: updated.isUnlocked ? true : nextBalance >= updated.cost,
                  };
                })
              );
              showToast({
                type: 'success',
                title: `"${item.name}" unlocked!`,
                message: 'Select Equip to apply it to your profile setup.',
              });
            } catch (e: any) {
              const msg = e?.data?.message || e?.message || 'Could not unlock item.';
              Alert.alert('Purchase failed', msg);
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const handleEquip = async (item: ShopItem) => {
    if (!userId) return;
    setPurchasing(item.id);
    try {
      await creditService.equipShopItem(userId, item.id);
      setItems((prev) =>
        prev.map((i) => ({
          ...i,
          isEquipped: i.id === item.id ? true : i.type === item.type ? false : i.isEquipped,
        }))
      );
      showToast({
        type: 'success',
        title: `"${item.name}" equipped!`,
        message: 'Your updated cosmetic setup is now active.',
      });
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Could not equip item.';
      Alert.alert('Equip failed', msg);
    } finally {
      setPurchasing(null);
    }
  };

  const anyBusy = purchasing !== null; // lock all buttons while any op is in flight

  const renderItem = ({ item }: { item: ShopItem }) => {
    const isThisItemBusy = purchasing === item.id;
    const isSelected = selectedPreviewItem?.id === item.id;
    const isFree = item.cost === 0;
    const creditsNeeded = Math.max(0, item.cost - balance);
    const rarityColor = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common;
    const typeMeta = getTypeMeta(item.type);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setSelectedPreviewId(item.id)}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isSelected && { borderColor: item.color },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: `${item.color}22` }]}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {formatRarity(item.rarity)}
              </Text>
            </View>
            {item.isLimited ? (
              <View style={styles.limitedBadge}>
                <Text style={styles.limitedBadgeText}>Limited</Text>
              </View>
            ) : null}
            {item.isFeatured ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
            {item.isEquipped ? (
              <View style={styles.equippedBadge}>
                <Text style={styles.equippedBadgeText}>Equipped</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.itemMetaText}>
            {typeMeta.label}
            {item.collection ? `  •  ${item.collection}` : ''}
          </Text>
          <Text style={styles.itemDescription}>{item.description}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.priceColumn}>
              {isFree ? (
                <Text style={styles.freeText}>Free</Text>
              ) : (
                <View style={styles.costRow}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.costText}>{item.cost.toLocaleString()}</Text>
                </View>
              )}
              {!item.isUnlocked && !item.canAfford ? (
                <Text style={styles.helperText}>Need {creditsNeeded.toLocaleString()} more credits</Text>
              ) : (
                <Text style={styles.helperText}>
                  {item.isUnlocked ? 'Owned and ready to equip' : 'Tap to preview'}
                </Text>
              )}
            </View>

            {item.isEquipped ? (
              <View style={[styles.btn, styles.btnEquippedStatic]}>
                <Text style={styles.btnText}>Active</Text>
              </View>
            ) : item.isUnlocked ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnEquip]}
                onPress={() => handleEquip(item)}
                disabled={anyBusy}
              >
                {isThisItemBusy ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.btnText}>Equip</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btn, item.canAfford ? styles.btnBuy : styles.btnLocked]}
                onPress={() => item.canAfford && !anyBusy && handlePurchase(item)}
                disabled={!item.canAfford || anyBusy}
              >
                {isThisItemBusy ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.btnText}>
                    {item.cost === 0 ? 'Get Free' : item.canAfford ? 'Unlock' : 'Not enough'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen
      title="Credits Shop"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={['top', 'bottom']}
      onHeaderLeftPress={() => navigation.goBack()}
      useScrollView={false}
      disableChildrenWrapper
    >
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.balanceBanner}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.balanceText}>{balance.toLocaleString()} credits</Text>
            </View>

            <Text style={[TextStyles.caption, styles.descriptionText]}>
              Build a profile look with titles, banners, frames, showcases, and special seasonal cosmetics.
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{ownedCount}</Text>
                <Text style={styles.summaryLabel}>Owned</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{affordableCount}</Text>
                <Text style={styles.summaryLabel}>Affordable</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{collectionCount}</Text>
                <Text style={styles.summaryLabel}>Collections</Text>
              </View>
            </View>

            {featuredItem ? (
              <View style={[styles.featuredCard, { borderColor: featuredItem.color }]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setSelectedPreviewId(featuredItem.id)}
                >
                  <View style={styles.featuredHeader}>
                    <View>
                      <Text style={styles.featuredOverline}>Featured pick</Text>
                      <Text style={styles.featuredTitle}>{featuredItem.name}</Text>
                    </View>
                    <Text style={styles.featuredIcon}>{featuredItem.icon}</Text>
                  </View>
                  <Text style={styles.featuredDescription}>{featuredItem.description}</Text>
                  <View style={styles.featuredFooter}>
                    <Text style={styles.featuredMeta}>
                      {getTypeMeta(featuredItem.type).label}
                      {featuredItem.collection ? ` • ${featuredItem.collection}` : ''}
                    </Text>
                    {featuredItem.cost === 0 ? (
                      <Text style={styles.freeText}>Free</Text>
                    ) : (
                      <View style={styles.costRow}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.costText}>{featuredItem.cost.toLocaleString()}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                {!featuredItem.isEquipped && (
                  <TouchableOpacity
                    style={[
                      styles.featuredActionBtn,
                      featuredItem.isUnlocked
                        ? styles.btnEquip
                        : featuredItem.canAfford
                        ? styles.btnBuy
                        : styles.btnLocked,
                    ]}
                    onPress={() => {
                      if (featuredItem.isUnlocked) handleEquip(featuredItem);
                      else if (featuredItem.canAfford) handlePurchase(featuredItem);
                    }}
                    disabled={(!featuredItem.canAfford && !featuredItem.isUnlocked) || anyBusy}
                  >
                    {purchasing === featuredItem.id ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.btnText}>
                        {featuredItem.isUnlocked
                          ? 'Equip'
                          : featuredItem.cost === 0
                          ? 'Get Free'
                          : featuredItem.canAfford
                          ? 'Unlock'
                          : 'Not enough'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {featuredItem.isEquipped && (
                  <View style={[styles.featuredActionBtn, styles.btnEquippedStatic]}>
                    <Text style={styles.btnText}>Active</Text>
                  </View>
                )}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Shop by category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {categories.map((category) => {
                const active = selectedCategory === category;
                const meta = category === 'all' ? { label: 'All', icon: 'apps-outline' } : getTypeMeta(category);
                return (
                  <TouchableOpacity
                    key={category}
                    activeOpacity={0.85}
                    onPress={() => setSelectedCategory(category)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={meta.icon as any}
                      size={14}
                      color={active ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Refine</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {FILTER_META.map((filter) => {
                const active = selectedFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    activeOpacity={0.85}
                    onPress={() => setSelectedFilter(filter.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedPreviewItem ? (
              <>
                <Text style={styles.sectionLabel}>Live preview</Text>
                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: `${(previewBanner ?? selectedPreviewItem).color}20`,
                      borderColor: (previewBanner ?? selectedPreviewItem).color,
                    },
                  ]}
                >
                  <View style={styles.previewTopRow}>
                    <View>
                      <Text style={styles.previewOverline}>Previewing</Text>
                      <Text style={styles.previewTitle}>{selectedPreviewItem.name}</Text>
                    </View>
                    <Text style={styles.previewMainIcon}>{selectedPreviewItem.icon}</Text>
                  </View>

                  <View style={styles.previewProfileRow}>
                    <View
                      style={[
                        styles.previewAvatarFrame,
                        { borderColor: previewFrame?.color ?? Colors.white },
                      ]}
                    >
                      <Text style={styles.previewAvatarLetter}>
                        {(user?.name || 'User').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.previewTextBlock}>
                      <Text style={styles.previewName}>{user?.name || 'User'}</Text>
                      {previewTitle ? (
                        <View style={[styles.previewTitleBadge, { borderColor: previewTitle.color }]}>
                          <Text style={styles.previewTitleBadgeText}>
                            {previewTitle.icon} {previewTitle.name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.previewDetailsRow}>
                    {previewShowcase ? (
                      <View style={[styles.previewMiniCard, { borderColor: previewShowcase.color }]}>
                        <Text style={styles.previewMiniCardTitle}>
                          {previewShowcase.icon} Achievement Showcase
                        </Text>
                        <Text style={styles.previewMiniCardText}>Featured milestones with a polished shelf.</Text>
                      </View>
                    ) : null}

                    {previewReaction ? (
                      <View style={[styles.previewBubble, { borderColor: previewReaction.color }]}>
                        <Text style={styles.previewBubbleText}>{previewReaction.icon} Reactions unlocked</Text>
                      </View>
                    ) : null}
                  </View>

                  {previewEffect ? (
                    <Text style={styles.previewEffectText}>
                      {previewEffect.icon} {previewEffect.name} adds extra celebration energy to your setup.
                    </Text>
                  ) : null}
                </View>
              </>
            ) : null}

            {recentUnlocks.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Recently unlocked</Text>
                <View style={styles.recentRow}>
                  {recentUnlocks.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPreviewId(item.id)}
                      style={[styles.recentChip, { borderColor: item.color }]}
                    >
                      <Text style={styles.recentChipText}>{item.icon} {item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Catalog</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={Colors.secondary} />
            </View>
          ) : (
            <View style={styles.stateContainer}>
              <Ionicons name="storefront-outline" size={42} color={Colors.textMuted ?? Colors.textSecondary} />
              <Text style={[TextStyles.h4, styles.emptyTitle]}>No items match this filter</Text>
              <Text style={[TextStyles.caption, styles.emptyText]}>
                Try another category or filter to browse the rest of the store.
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.secondary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.base,
    flexGrow: 1,
  },
  listHeader: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  balanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.textInputBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
  },
  balanceText: {
    ...TextStyles.bodyMedium,
    color: Colors.textPrimary,
  },
  descriptionText: {
    marginBottom: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.textInputBg,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  summaryValue: {
    ...TextStyles.h4,
    marginBottom: 2,
  },
  summaryLabel: {
    ...TextStyles.captionSmall,
    color: Colors.textSecondary,
  },
  featuredCard: {
    backgroundColor: Colors.textInputBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  featuredOverline: {
    ...TextStyles.captionSmall,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  featuredTitle: {
    ...TextStyles.h4,
    marginBottom: 0,
  },
  featuredIcon: {
    fontSize: 28,
  },
  featuredDescription: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredMeta: {
    ...TextStyles.captionSmall,
    color: Colors.textSecondary,
  },
  featuredActionBtn: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  sectionLabel: {
    ...TextStyles.bodySmallBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.textInputBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: Colors.secondary,
  },
  chipText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
  filterChip: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.white,
  },
  filterChipText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  previewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  previewOverline: {
    ...TextStyles.captionSmall,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  previewTitle: {
    ...TextStyles.h4,
    marginBottom: 0,
  },
  previewMainIcon: {
    fontSize: 30,
  },
  previewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  previewAvatarFrame: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: Spacing.base,
  },
  previewAvatarLetter: {
    ...TextStyles.h3,
    marginBottom: 0,
  },
  previewTextBlock: {
    flex: 1,
  },
  previewName: {
    ...TextStyles.bodyMedium,
    fontSize: 18,
    marginBottom: Spacing.xs,
  },
  previewTitleBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  previewTitleBadgeText: {
    ...TextStyles.caption,
    color: Colors.textPrimary,
  },
  previewDetailsRow: {
    gap: Spacing.sm,
  },
  previewMiniCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  previewMiniCardTitle: {
    ...TextStyles.bodySmallBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  previewMiniCardText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  previewBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewBubbleText: {
    ...TextStyles.caption,
    color: Colors.textPrimary,
  },
  previewEffectText: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  recentChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.textInputBg,
  },
  recentChipText: {
    ...TextStyles.caption,
    color: Colors.textPrimary,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.textInputBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: Spacing.base,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: Colors.backgroundGray,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  itemName: {
    ...TextStyles.bodyMedium,
    color: Colors.textPrimary,
  },
  itemMetaText: {
    ...TextStyles.captionSmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  rarityBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  rarityText: {
    ...TextStyles.captionSmall,
    fontSize: 10,
  },
  limitedBadge: {
    backgroundColor: '#7C2D12',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  limitedBadgeText: {
    ...TextStyles.captionSmall,
    color: '#FDBA74',
    fontSize: 10,
  },
  featuredBadge: {
    backgroundColor: '#1D4ED8',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  featuredBadgeText: {
    ...TextStyles.captionSmall,
    color: '#BFDBFE',
    fontSize: 10,
  },
  equippedBadge: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  equippedBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '600',
  },
  itemDescription: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  priceColumn: {
    flex: 1,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '600',
  },
  helperText: {
    ...TextStyles.captionSmall,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  freeText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '600',
  },
  btn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 86,
    alignItems: 'center',
  },
  btnBuy: {
    backgroundColor: Colors.secondary,
  },
  btnEquip: {
    backgroundColor: Colors.green,
  },
  btnEquippedStatic: {
    backgroundColor: Colors.gray500,
  },
  btnLocked: {
    backgroundColor: Colors.gray500,
  },
  btnText: {
    fontSize: 13,
    color: Colors.white,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    marginTop: Spacing.md,
  },
  emptyText: {
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
