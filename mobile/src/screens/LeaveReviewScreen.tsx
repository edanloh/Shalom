// screens/LeaveReviewScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, TextStyles } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import type { MainStackParamList } from '../types/navigation';

type R = RouteProp<MainStackParamList, 'LeaveReview'>;

export default function LeaveReviewScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const userId = user?.id!;
  const { courseId } = route.params;

  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canSubmit = rating > 0 && text.trim().length >= 10;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const existing = await courseService.getUserReview(courseId, userId);
      if (mounted && existing) {
        setRating(existing.rating);
        setText(existing.review);
        setIsEditing(true);
      }
    })();
    return () => { mounted = false };
  }, [courseId, userId]);


  const onSelectStar = async (val: number) => {
    await Haptics.selectionAsync();
    setRating(prev => (prev === val ? 0 : val));
    };

  const onSubmit = async () => {
    if (!rating) return Alert.alert('Rating required', 'Please select a star rating.');
    if (text.trim().length < 10) {
      return Alert.alert('Tell us a bit more', 'Please write at least 10 characters.');
    }
    if (submitting) return;

    setSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload = { userId, rating, review: text.trim(), isAnonymous: false };

    const doSuccess = (msg = 'Thanks for your feedback.') => {
      Alert.alert(isEditing ? '✅ Review updated!' : '✅ Review submitted!', msg);
      navigation.goBack();
    };

    try {
      // If already in edit mode → PUT; else try POST first
      if (isEditing) {
        await courseService.updateCourseReview(courseId, payload);
        return doSuccess();
      }

      await courseService.postCourseReview(courseId, payload);
      return doSuccess();
    } catch (e: any) {
      const status = e?.status ?? e?.statusCode;
      const msg =
        e?.data?.message ||
        (typeof e?.data === 'string' ? e.data : e?.message) ||
        'Please try again.';

      if (status === 409 && !isEditing) {
        // Already has a review → offer to edit (PUT with same values)
        return Alert.alert(
          "You've already reviewed this course",
          'Do you want to update your existing review?',
          [
            { text: 'Cancel', onPress: () => setSubmitting(false), style: 'cancel' },
            {
              text: 'Update review',
              onPress: async () => {
                try {
                  setIsEditing(true);
                  await courseService.updateCourseReview(courseId, payload);
                  doSuccess('Your review has been updated.');
                } catch (err: any) {
                  const m =
                    err?.data?.message ||
                    (typeof err?.data === 'string' ? err.data : err?.message) ||
                    'Please try again.';
                  Alert.alert('Could not update review', m);
                } finally {
                  setSubmitting(false);
                }
              },
            },
          ]
        );
      }

      if (status === 404 && isEditing) {
        // You tried to edit but no row exists → fall back to create
        try {
          await courseService.postCourseReview(courseId, payload);
          return doSuccess();
        } catch (err2: any) {
          const m =
            err2?.data?.message ||
            (typeof err2?.data === 'string' ? err2.data : err2?.message) ||
            'Please try again.';
          Alert.alert('Could not submit review', m);
        } finally {
          setSubmitting(false);
        }
        return;
      }

      Alert.alert('Could not submit review', msg);
    } finally {
      if (!isEditing) setSubmitting(false); // editing branch may already set it
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header (matches WishlistScreen style) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave a Review</Text>
        <View style={{ width: 26 }} />{/* spacer to balance the chevron */}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 10, android: 0 })}
      >
        <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>How was this course?</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => onSelectStar(n)} style={styles.starBtn} hitSlop={8}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={28} color="#FFD700" />
              </Pressable>
            ))}
          </View>

          <Text style={styles.heading}>Leave a Comment!</Text>

          <TextInput
            style={styles.input}
            placeholder="Share your experience (min 10 chars)"
            placeholderTextColor={Colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1200}
          />

            <View style={styles.bottomSection}>

              <Pressable
                style={[styles.submitBtn, !canSubmit && { opacity: 0.6 }]}
                onPress={onSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.submitText}>{isEditing ? 'Update Review' : 'Submit Review'}</Text>}
              </Pressable>

                <View style={styles.footerMessage}>
                <Text style={styles.footerText}>
                    Reviews help other learners decide if this course is right for them.
                </Text>
                </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },

  // Header styles reused to match WishlistScreen
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

  body: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },

  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },

  starsRow: { flexDirection: 'row', marginBottom: Spacing.xl },
  starBtn: { marginRight: Spacing.sm },

  input: {
    minHeight: 140,
    borderRadius: 12,
    padding: Spacing.md,
    backgroundColor: Colors.textInputBg,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: Spacing.lg,
  },

  footerMessage: {
    marginVertical: Spacing.md,
  },
    footerText: {
    ...TextStyles.body,
    fontSize: 11,
    color: Colors.textSecondary, 
    opacity: 0.7, 
    textAlign: 'center',
    lineHeight: 16,
    },

  submitBtn: {
    backgroundColor: Colors.purple400,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: Colors.white, fontWeight: '700', fontSize: TextStyles.body.fontSize },
});
