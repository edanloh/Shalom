import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCourses } from '../contexts/CourseContext';

export default function SearchScreen({ navigation, route }: any) {
  const { courses, searchCourses, getCoursesByCategory } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(courses);
  const [recentSearches, setRecentSearches] = useState([
    'React Native',
    'Machine Learning',
    'UI/UX Design',
    'Python',
  ]);

  const categories = [
    { name: 'Programming', icon: 'code-slash', color: '#3b82f6' },
    { name: 'Design', icon: 'color-palette', color: '#8b5cf6' },
    { name: 'Business', icon: 'trending-up', color: '#10b981' },
    { name: 'Photography', icon: 'camera', color: '#f59e0b' },
    { name: 'Music', icon: 'musical-notes', color: '#ef4444' },
    { name: 'Data Science', icon: 'analytics', color: '#06b6d4' },
  ];

  // Calculate responsive columns
  const screenWidth = Dimensions.get('window').width;
  const numColumns = Platform.OS === 'web' 
    ? (screenWidth > 1200 ? 4 : screenWidth > 768 ? 3 : 2)
    : 2;

  useEffect(() => {
    if (route.params?.category) {
      handleCategorySearch(route.params.category);
    }
  }, [route.params]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const searchResults = searchCourses(query);
      setResults(searchResults);

      // Update recent searches
      const updatedSearches = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
      setRecentSearches(updatedSearches);
    } else {
      setResults(courses);
    }
  };

  const handleCategorySearch = (category: string) => {
    const categoryResults = getCoursesByCategory(category);
    setResults(categoryResults);
    setSearchQuery('');
  };

  const renderCourse = ({ item }: any) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.courseThumbnail} />
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.courseInstructor}>{item.instructor}</Text>
        <View style={styles.courseStats}>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.students}>{item.students.toLocaleString()} students</Text>
        </View>
        <Text style={styles.price}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.categoryItem, { backgroundColor: item.color + '20' }]}
      onPress={() => handleCategorySearch(item.name)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={20} color="#fff" />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: any) => (
    <TouchableOpacity style={styles.recentItem} onPress={() => handleSearch(item)}>
      <Ionicons name="time" size={16} color="#6b7280" />
      <Text style={styles.recentText}>{item}</Text>
      <TouchableOpacity
        onPress={() => setRecentSearches(recentSearches.filter((s) => s !== item))}
      >
        <Ionicons name="close" size={16} color="#6b7280" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, instructors..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {searchQuery.trim() === '' ? (
        <View style={styles.defaultContent}>
          {/* Categories */}
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.name}
            numColumns={numColumns}
            key={`categories-${numColumns}`} // Force re-render when columns change
            style={styles.categoriesGrid}
            columnWrapperStyle={numColumns > 1 ? styles.categoryRow : undefined}
          />

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearch}
                keyExtractor={(item) => item}
                style={styles.recentList}
              />
            </>
          )}
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            {results.length} results for "{searchQuery}"
          </Text>
          <FlatList
            data={results}
            renderItem={renderCourse}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchHeader: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1f2937' },
  defaultContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, marginTop: 8 },
  categoriesGrid: { marginBottom: 32 },
  categoryRow: { justifyContent: 'space-between' },
  categoryItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    margin: 4, 
    borderRadius: 12,
    minHeight: 60,
  },
  categoryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  recentList: { flex: 1 },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  recentText: { flex: 1, fontSize: 16, color: '#1f2937', marginLeft: 12 },
  resultsContainer: { flex: 1, padding: 16 },
  resultsHeader: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  courseItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  courseThumbnail: { width: 80, height: 80, borderRadius: 8 },
  courseInfo: { flex: 1, marginLeft: 12 },
  courseTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  courseInstructor: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  courseStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rating: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  ratingText: { fontSize: 12, color: '#1f2937', marginLeft: 4 },
  students: { fontSize: 12, color: '#6b7280' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#8B5CF6' },
});
