import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CourseCardProps {
  id: string;
  title: string;
  instructor: string;
  rating: number;
  students: number;
  duration: string;
  price: number;
  originalPrice?: number;
  thumbnail: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  onEnroll?: () => void;
  onPlay?: () => void;
  onPress?: () => void;
}

const CourseCard = ({
  title,
  instructor,
  rating,
  students,
  duration,
  price,
  originalPrice,
  thumbnail,
  category,
  level,
  onEnroll,
  onPlay,
  onPress
}: CourseCardProps) => {
  const levelColors = {
    Beginner: { bg: '#d1fae5', text: '#065f46' },
    Intermediate: { bg: '#fef3c7', text: '#78350f' },
    Advanced: { bg: '#fee2e2', text: '#991b1b' },
  };

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      <View>
        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        {/* Overlay Gradient */}
        <View style={styles.overlay} />

        {/* Play Button */}
        <TouchableOpacity style={styles.playButton} onPress={onPress}>
          <Ionicons name="play" size={20} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>

        {/* Level Badge */}
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: levelColors[level].bg },
          ]}
        >
          <Text style={{ color: levelColors[level].text, fontSize: 12, fontWeight: '500' }}>
            {level}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.instructor}>by {instructor}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color="#facc15" />
            <Text style={styles.statText}>{rating}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#6b7280" />
            <Text style={styles.statText}>{students.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color="#6b7280" />
            <Text style={styles.statText}>{duration}</Text>
          </View>
        </View>

        {/* Price & Enroll */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${price}</Text>
            {originalPrice && (
              <Text style={styles.originalPrice}>${originalPrice}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.enrollButton} onPress={onEnroll}>
            <Text style={styles.enrollText}>Enroll Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CourseCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: 180,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playButton: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(139,92,246,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  levelBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  instructor: {
    fontSize: 14,
    color: '#6b7280',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  originalPrice: {
    fontSize: 12,
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  enrollButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enrollText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
