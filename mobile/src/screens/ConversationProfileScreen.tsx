import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants';
import { ImageWithFallback } from '../components/common';
import { Images } from '../../assets';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { bannerPaletteFor, frameStyleFor, titleBadgeStyleFor } from '@/utils/cosmetics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 190;
const AVATAR_SIZE = 96;
const AVATAR_URL_BASE = 'https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/profilepics/';
const COURSE_IMG_BASE = 'https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/';
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

type Role = 'instructor' | 'learner' | null;

type Cosmetics = { title: any; frame: any; banner: any };

type Course = {
  id: string;
  title: string;
  rating: number | null;
  thumbnail_url: string | null;
};

type SharedLink = { url: string; id: string | number };

export default function ConversationProfileScreen({ navigation, route }: any) {
  const { user } = useUser();
  const conversation = route?.params?.conversation ?? null;
  const recipientId = conversation?.id ? String(conversation.id) : null;

  const [role, setRole] = useState<Role>(null);
  const [cosmetics, setCosmetics] = useState<Cosmetics>({ title: null, frame: null, banner: null });
  const [courses, setCourses] = useState<Course[]>([]);
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const avatarUri = conversation?.avatar_url
    ? `${AVATAR_URL_BASE}${conversation.avatar_url}`
    : Images.profile;

  const load = useCallback(async () => {
    if (!recipientId || !user) return;
    setLoading(true);

    // Always fetch: role, messages
    const [userResult, messagesResult] = await Promise.all([
      supabase.from('users').select('role').eq('id', recipientId).maybeSingle(),
      supabase
        .from('direct_messages')
        .select('id, content, sender_id, recipient_id')
        .or(`sender_id.eq.${user.uuid},recipient_id.eq.${user.uuid}`),
    ]);

    const resolvedRole: Role = userResult.data?.role === 'instructor' ? 'instructor' : 'learner';
    setRole(resolvedRole);

    // Parse messages
    const mine = (messagesResult.data || []).filter(
      (m: any) => String(m.sender_id) === recipientId || String(m.recipient_id) === recipientId
    );
    setMessageCount(mine.length);

    const links: SharedLink[] = [];
    const seen = new Set<string>();
    for (const msg of mine) {
      for (const url of (msg.content as string)?.match(URL_REGEX) ?? []) {
        if (!seen.has(url)) { seen.add(url); links.push({ url, id: msg.id }); }
      }
    }
    setSharedLinks(links);

    // Role-specific fetch
    if (resolvedRole === 'instructor') {
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, title, rating, thumbnail_url')
        .eq('instructor_id', recipientId)
        .eq('is_published', true)
        .order('rating', { ascending: false });
      setCourses((courseData ?? []) as Course[]);
    } else {
      const { data: cosmeticData } = await supabase
        .from('user_unlocked_items')
        .select('shop_items(name, color, icon, rarity, type)')
        .eq('user_id', recipientId)
        .eq('is_equipped', true);
      let title: any = null, frame: any = null, banner: any = null;
      (cosmeticData || []).forEach((row: any) => {
        const item = row.shop_items;
        if (!item) return;
        if (item.type === 'title') title = item;
        if (item.type === 'avatar_frame') frame = item;
        if (item.type === 'banner') banner = item;
      });
      setCosmetics({ title, frame, banner });
    }

    setLoading(false);
  }, [recipientId, user]);

  useEffect(() => { load(); }, [load]);

  const frameStyle = frameStyleFor(cosmetics.frame);
  const titleStyle = titleBadgeStyleFor(cosmetics.title);
  const bannerColors = role === 'learner'
    ? bannerPaletteFor(cosmetics.banner)
    : ['#1a1a2e', '#16213e', '#0f3460'] as [string, string, string];

  const isInstructor = role === 'instructor';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <LinearGradient
          colors={bannerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Ionicons name="chevron-back" size={26} color={Colors.white} />
          </TouchableOpacity>

          {isInstructor && (
            <View style={styles.instructorBadge}>
              <Ionicons name="school-outline" size={13} color="#93C5FD" />
              <Text style={styles.instructorBadgeText}>Instructor</Text>
            </View>
          )}
        </LinearGradient>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[
            styles.avatarOuter,
            !isInstructor ? frameStyle.outer : styles.instructorAvatarRing,
          ]}>
            <View style={[
              styles.avatarInner,
              !isInstructor ? frameStyle.inner : null,
            ]}>
              <ImageWithFallback
                source={{ uri: avatarUri.toString() }}
                fallback={Images.profile}
                style={styles.avatar}
              />
            </View>
          </View>

          <Text style={styles.name}>{conversation?.name ?? 'Unknown'}</Text>

          {!isInstructor && cosmetics.title && (
            <View style={[styles.titleBadge, titleStyle.badge]}>
              <Text style={[styles.titleBadgeText, titleStyle.text]}>
                {cosmetics.title.icon}{'  '}{cosmetics.title.name}
              </Text>
            </View>
          )}

          {isInstructor && (
            <Text style={styles.instructorSubtitle}>
              {courses.length > 0
                ? `${courses.length} published ${courses.length === 1 ? 'course' : 'courses'}`
                : 'Instructor'}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        ) : (
          <>
            {/* ── INSTRUCTOR VIEW ── */}
            {isInstructor && (
              <>
                <SectionHeader title="Courses" />
                {courses.length === 0 ? (
                  <EmptyState icon="library-outline" text="No published courses yet" />
                ) : (
                  <View style={styles.card}>
                    {courses.map((course, idx) => (
                      <View key={course.id}>
                        {idx > 0 && <View style={styles.divider} />}
                        <TouchableOpacity
                          style={styles.courseRow}
                          activeOpacity={0.7}
                          onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                        >
                          <View style={styles.courseThumbnailWrap}>
                            {course.thumbnail_url ? (
                              <ImageWithFallback
                                source={{ uri: `${COURSE_IMG_BASE}${course.thumbnail_url}` }}
                                fallback={Images.profile}
                                style={styles.courseThumbnail}
                              />
                            ) : (
                              <View style={[styles.courseThumbnail, styles.courseThumbnailFallback]}>
                                <Ionicons name="library-outline" size={20} color={Colors.textSecondary} />
                              </View>
                            )}
                          </View>
                          <View style={styles.courseInfo}>
                            <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                            {course.rating != null && (
                              <View style={styles.ratingRow}>
                                <Ionicons name="star" size={11} color="#FACC15" />
                                <Text style={styles.ratingText}>{Number(course.rating).toFixed(1)}</Text>
                              </View>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* ── LEARNER VIEW ── */}
            {!isInstructor && (
              <>
                <SectionHeader title="Cosmetics" />
                {!cosmetics.frame && !cosmetics.title && !cosmetics.banner ? (
                  <EmptyState icon="sparkles-outline" text="No cosmetics equipped" />
                ) : (
                  <View style={styles.cosmeticsGrid}>
                    {cosmetics.banner && (
                      <CosmeticTile
                        icon="image-outline"
                        label="Banner"
                        name={cosmetics.banner.name}
                        color={cosmetics.banner.color}
                        rarity={cosmetics.banner.rarity}
                      />
                    )}
                    {cosmetics.frame && (
                      <CosmeticTile
                        icon="shield-outline"
                        label="Frame"
                        name={cosmetics.frame.name}
                        color={cosmetics.frame.color}
                        rarity={cosmetics.frame.rarity}
                      />
                    )}
                    {cosmetics.title && (
                      <CosmeticTile
                        icon={cosmetics.title.icon ?? 'ribbon-outline'}
                        label="Title"
                        name={cosmetics.title.name}
                        color={cosmetics.title.color}
                        rarity={cosmetics.title.rarity}
                        isEmoji
                      />
                    )}
                  </View>
                )}
              </>
            )}

            {/* Conversation stats — common */}
            <SectionHeader title="Conversation" />
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.secondary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Messages</Text>
                  <Text style={styles.infoValue}>
                    {messageCount} {messageCount === 1 ? 'message' : 'messages'} exchanged
                  </Text>
                </View>
              </View>
            </View>

            {/* Shared links — only when present */}
            {sharedLinks.length > 0 && (
              <>
                <SectionHeader title="Shared Links" />
                <View style={styles.card}>
                  {sharedLinks.map((link, idx) => (
                    <View key={String(link.id) + link.url}>
                      {idx > 0 && <View style={styles.divider} />}
                      <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => Linking.openURL(link.url)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.infoIconWrap}>
                          <Ionicons name="link-outline" size={18} color={Colors.secondary} />
                        </View>
                        <Text style={styles.linkText} numberOfLines={1}>
                          {link.url.replace(/^https?:\/\//, '')}
                        </Text>
                        <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Sub-components ── */

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={sectionHeaderStyle}>{title.toUpperCase()}</Text>
  );
}

const sectionHeaderStyle: import('react-native').TextStyle = {
  fontSize: 11,
  fontWeight: '700',
  color: Colors.textSecondary,
  letterSpacing: 0.9,
  marginHorizontal: Spacing.xl,
  marginTop: Spacing.lg,
  marginBottom: Spacing.sm,
};

function EmptyState({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={26} color={Colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function CosmeticTile({
  icon, label, name, color, rarity, isEmoji,
}: {
  icon: string; label: string; name: string;
  color?: string | null; rarity?: string | null; isEmoji?: boolean;
}) {
  const c = color ?? Colors.secondary;
  const rarityLabel = rarity ? rarity.charAt(0).toUpperCase() + rarity.slice(1) : null;
  return (
    <View style={[styles.cosmeticTile, { borderColor: `${c}44`, backgroundColor: `${c}11` }]}>
      <View style={[styles.cosmeticIconWrap, { backgroundColor: `${c}22` }]}>
        {isEmoji ? (
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        ) : (
          <Ionicons name={icon as any} size={20} color={c} />
        )}
      </View>
      <Text style={styles.cosmeticLabel}>{label}</Text>
      <Text style={[styles.cosmeticName, { color: c }]} numberOfLines={2}>{name}</Text>
      {rarityLabel && (
        <Text style={[styles.cosmeticRarity, { color: c }]}>{rarityLabel}</Text>
      )}
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  banner: {
    height: BANNER_HEIGHT,
    width: SCREEN_WIDTH,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(147,197,253,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  instructorBadgeText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  avatarOuter: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
  },
  instructorAvatarRing: {
    borderColor: '#93C5FD',
    backgroundColor: 'rgba(147,197,253,0.10)',
    shadowColor: '#93C5FD',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  instructorSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  titleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingWrap: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
  },
  card: {
    marginHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 60,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.secondary}22`,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
    marginTop: 1,
  },
  // Courses
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
  },
  courseThumbnailWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  courseThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  courseThumbnailFallback: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseInfo: {
    flex: 1,
    gap: 4,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#FACC15',
    fontWeight: '600',
  },
  // Cosmetics grid
  cosmeticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: Spacing.xl,
    gap: 10,
    marginBottom: Spacing.xs,
  },
  cosmeticTile: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.xl * 2 - 20) / 2 - 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  cosmeticIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cosmeticLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cosmeticName: {
    fontSize: 14,
    fontWeight: '700',
  },
  cosmeticRarity: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.75,
  },
  // Links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '500',
  },
  // Empty
  emptyCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
