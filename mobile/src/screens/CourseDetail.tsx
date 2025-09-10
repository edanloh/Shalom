// mobile/src/screens/CourseDetail.tsx - New file
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const CourseDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId } = route.params || {};

  // Mock course data - replace with actual data fetching
  const course = {
    id: courseId,
    title: 'Complete Web Development Bootcamp 2024',
    instructor: 'Sarah Chen',
    rating: 4.9,
    students: 45000,
    duration: '40h',
    price: 89,
    originalPrice: 199,
    thumbnail: require('@assets/placeholder.png'),
    category: 'Web Development',
    level: 'Beginner',
    description: 'Learn web development from scratch with this comprehensive bootcamp. Cover HTML, CSS, JavaScript, React, Node.js, and more.',
    sections: [
      { title: 'Introduction to Web Development', lessons: 5, duration: '2h' },
      { title: 'HTML Fundamentals', lessons: 8, duration: '4h' },
      { title: 'CSS Styling', lessons: 10, duration: '6h' },
      { title: 'JavaScript Basics', lessons: 12, duration: '8h' },
      { title: 'React Framework', lessons: 15, duration: '10h' },
    ],
    requirements: [
      'Basic computer knowledge',
      'No programming experience required',
      'A computer with internet connection'
    ],
    outcomes: [
      'Build responsive websites',
      'Create interactive web applications',
      'Understand modern web development practices',
      'Deploy applications to the web'
    ]
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Details</Text>
      </View>

      {/* Course Image */}
      <Image source={course.thumbnail} style={styles.courseImage} />

      {/* Course Info */}
      <View style={styles.content}>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.instructor}>by {course.instructor}</Text>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.statText}>{course.rating}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people" size={16} color="#6B7280" />
            <Text style={styles.statText}>{course.students.toLocaleString()} students</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time" size={16} color="#6B7280" />
            <Text style={styles.statText}>{course.duration}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{course.category}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{course.level}</Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${course.price}</Text>
          <Text style={styles.originalPrice}>${course.originalPrice}</Text>
          <Text style={styles.discount}>Save ${course.originalPrice - course.price}</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you'll learn</Text>
          <Text style={styles.description}>{course.description}</Text>
        </View>

        {/* Course Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Content</Text>
          {course.sections.map((section, index) => (
            <View key={index} style={styles.sectionItem}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionName}>{section.title}</Text>
                <Text style={styles.sectionMeta}>{section.lessons} lessons • {section.duration}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          {course.requirements.map((req, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.listText}>{req}</Text>
            </View>
          ))}
        </View>

        {/* Outcomes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you'll achieve</Text>
          {course.outcomes.map((outcome, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.listText}>{outcome}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA Button */}
      <View style={styles.cta}>
        <TouchableOpacity style={styles.enrollButton}>
          <Text style={styles.enrollText}>Enroll Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  courseImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  instructor: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
  badges: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 16,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  discount: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  sectionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  sectionMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  listText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  cta: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  enrollButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  enrollText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CourseDetail;