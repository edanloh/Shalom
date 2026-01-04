import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants';
import { Images } from '../../../assets';

interface CourseCardProps {
  title: string;
  subtitle: string;
  image: string;
  completedModules: number;
  totalModules: number;
  completion: number;
  duration: string;
  rating: number;
  instructor: string;
  instructorAvatar: string;
  category: string;
}

export default function CourseCard({ 
  title,
  subtitle,
  image,
  completedModules,
  totalModules,
  completion,
  duration,
  rating,
  instructor,
  instructorAvatar,
  category,
}: CourseCardProps) {

  return (
    <View style={styles.courseCard}>
      <Image 
        source={{ uri: image }} 
        defaultSource={Images.placeholder}
        style={styles.courseImage} 
      />
      <View style={styles.courseContent}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.courseSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        <Text style={styles.courseProgress}>{completedModules} of {totalModules} modules completed</Text>
        
        <View style={styles.courseFooter}>
          <View style={styles.instructorSection}>
            <Image 
              source={{ uri: instructorAvatar }} 
              defaultSource={Images.defaultAvatar}
              style={styles.instructorAvatar} 
            />
            <Text style={styles.instructorName}>{instructor}</Text>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completion}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  courseCard: {
    backgroundColor: '#3a3a3a',
    borderRadius: 15,
    marginHorizontal: 25,
    marginBottom: 20,
    overflow: 'hidden',
  },
  courseImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  courseContent: {
    padding: 20,
  },
  courseTitle: {
    fontSize: 20,
    color: 'white',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#a19eb8',
    marginBottom: 8,
  },
  courseProgress: {
    fontSize: 12,
    color: '#a19eb8',
    marginBottom: 15,
  },
  courseFooter: {
    gap: 15,
  },
  instructorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instructorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  instructorName: {
    fontSize: 14,
    color: 'white',
    flex: 1,
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryText: {
    fontSize: 10,
    color: '#c9c6ec',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    color: '#564beb',
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#a19eb8',
  },
});