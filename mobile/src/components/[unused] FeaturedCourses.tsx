import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CourseCard from '@/components/home/CourseCard';
import { useNavigation } from '@react-navigation/native';

const featuredCourses = [
    {
        id: '1',
        title: 'Complete Web Development Bootcamp 2024',
        instructor: 'Sarah Chen',
        rating: 4.9,
        students: 45000,
        duration: '40h',
        price: 89,
        originalPrice: 199,
        thumbnail: require('@assets/placeholder_icon.png'),
        category: 'Web Development',
        level: 'Beginner' as const,
    },
    {
        id: '2',
        title: 'Machine Learning Fundamentals with Python',
        instructor: 'Dr. James Wilson',
        rating: 4.8,
        students: 32000,
        duration: '35h',
        price: 119,
        originalPrice: 249,
        thumbnail: require('@assets/placeholder_icon.png'),
        category: 'Data Science',
        level: 'Intermediate' as const,
    },
    {
        id: '3',
        title: 'UI/UX Design Masterclass',
        instructor: 'Emma Rodriguez',
        rating: 4.9,
        students: 28000,
        duration: '25h',
        price: 79,
        originalPrice: 159,
        thumbnail: require('@assets/placeholder_icon.png'),
        category: 'Design',
        level: 'Beginner' as const,
    },
    {
        id: '4',
        title: 'Advanced React & TypeScript',
        instructor: 'Michael Park',
        rating: 4.7,
        students: 18000,
        duration: '30h',
        price: 139,
        originalPrice: 279,
        thumbnail: require('@assets/placeholder_icon.png'),
        category: 'Frontend',
        level: 'Advanced' as const,
    },
];

const FeaturedCourses = () => {
  const navigation = useNavigation<any>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;
  
  const cardWidth = Platform.OS === 'web' ? 280 : screenWidth * 0.75;
  const cardSpacing = Platform.OS === 'web' ? 20 : 12;

  const handleCoursePress = (courseId: string) => {
    console.log('Navigate to course:', courseId);
    navigation.navigate('CourseDetail', { courseId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Featured Courses</Text>
        <Text style={styles.subtitle}>
          Discover our most popular courses, handpicked by our expert team
        </Text>
      </View>

      <View style={styles.carouselWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          decelerationRate={0.9}
          snapToInterval={cardWidth + cardSpacing * 2}
          snapToAlignment="start"
          pagingEnabled={false}
        >
          {featuredCourses.map((course) => (
            <View
              key={course.id}
              style={[
                styles.courseCardWrapper,
                { 
                  width: cardWidth,
                  marginHorizontal: cardSpacing
                },
                hoveredId === course.id && Platform.OS === 'web' && styles.hoveredCardWrapper
              ]}
            >
              <TouchableOpacity
                style={styles.courseCard}
                onPress={() => handleCoursePress(course.id)}
                onPressIn={() => setHoveredId(course.id)}
                onPressOut={() => setHoveredId(null)}
                activeOpacity={0.9}
              >
                <CourseCard {...course} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.cta}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>View All Courses</Text>
          <Ionicons name="arrow-forward" size={16} color="#8B5CF6" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  carouselWrapper: {
    marginBottom: 20,
  },
  carouselContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  courseCardWrapper: {
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    transform: [{ scale: 1 }],
  },
  hoveredCardWrapper: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 1,
  },
  courseCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cta: {
    marginTop: 24,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
});

export default FeaturedCourses;