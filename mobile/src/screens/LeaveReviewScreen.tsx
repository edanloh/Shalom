// screens/LeaveReviewScreen.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Spacing, TextStyles } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import creditService from '../services/creditService';
import type { MainStackParamList } from '../types/navigation';
import Screen from '../components/common/Screen';
import { ActionButton, CustomTextInput } from '@/components';

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
    const awardReviewCredit = async () => {
      try {
        await creditService.recordCreditEvent({
          userId,
          type: 'course_reviewed',
          title: 'Review submitted',
          points: 10,
          courseId,
        });
      } catch (err) {
        console.warn('Failed to record credit for review', err);
      }
    };

    try {
      // If already in edit mode → PUT; else try POST first
      if (isEditing) {
        await courseService.updateCourseReview(courseId, payload);
        return doSuccess();
      }

      await courseService.postCourseReview(courseId, payload);
      await awardReviewCredit();
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
          await awardReviewCredit();
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
    <Screen
      title="Leave a Review"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      customEdges={["top", "bottom"]}
      onHeaderLeftPress={() => navigation.goBack()}
    >
      <Text style={TextStyles.h5}>How was this course?</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onSelectStar(n)} style={styles.starBtn} hitSlop={8}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={28} color="#FFD700" />
          </Pressable>
        ))}
      </View>

      <Text style={TextStyles.h5}>Leave a Comment!</Text>

      <CustomTextInput
        placeholder="Share your experience (min 10 chars)"
        value={text}
        onChangeText={setText}
        autoCapitalize={"none"}
        multiline
        maxLength={1200}
        textAlignVertical="top"
        style={{minHeight: 100}}
      />

      <View style={styles.bottomSection}>
        <ActionButton
          onPress={onSubmit}
          disabled={!canSubmit || submitting}
          loading={submitting}
          text={isEditing ? 'Update Review' : 'Submit Review'}
          style={!canSubmit && { opacity: 0.6 }}
        />
        <Text style={TextStyles.caption}>
          Reviews help other learners decide if this course is right for them.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  starsRow: { flexDirection: 'row', marginBottom: Spacing.xl },
  starBtn: { marginRight: Spacing.sm },
});
