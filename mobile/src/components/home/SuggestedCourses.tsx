import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants';
import { Images } from '../../assets';

interface Course {
  id: string;
  title: string;
  level: string;
  rating: number;
  modules: number;
  image: string;
}

interface SuggestedCourseCardProps {
  course: Course;
  onPress?: () => void;
}

const SuggestedCourseCard: React.FC<SuggestedCourseCardProps> = ({ course, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: course.image }} 
          defaultSource={Images.placeholder}
          style={styles.courseImage} 
        />
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{course.level}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{course.rating}</Text>
            <Text style={styles.statLabel}>★ • {course.modules} modules</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface SuggestedCoursesProps {
  courses: Course[];
  onViewAll?: () => void;
}

const SuggestedCourses: React.FC<SuggestedCoursesProps> = ({ courses, onViewAll }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Suggested for You</Text>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {courses.map((course) => (
          <SuggestedCourseCard key={course.id} course={course} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.base,
  },
  card: {
    width: 180,
    marginRight: Spacing.base,
    backgroundColor: Colors.backgroundGray,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  courseImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  levelBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.purple400,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  levelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.white,
  },
  content: {
    padding: Spacing.base,
  },
  title: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.tight,
  },
  stats: {
    marginTop: 'auto',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.purple400,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});

export default SuggestedCourses;
