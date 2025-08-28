import React, { useState, useEffect } from 'react';
import {
View,
Text,
FlatList,
TouchableOpacity,
StyleSheet,
Image,
TextInput,
Dimensions,
StatusBar,
SafeAreaView,
ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCourses } from '../contexts/CourseContext';
import { useUser } from '../contexts/UserContext';

const { width: screenWidth } = Dimensions.get('window');

// Custom Icon Components
const SearchIcon = ({ size = 20, color = '#9ca3af' }) => (
<View style={[styles.customIcon, { width: size, height: size }]}>
  <Text style={[styles.iconText, { fontSize: size * 0.8, color }]}>🔍</Text>
</View>
);

const StarIcon = ({ size = 14, color = '#fbbf24' }) => (
<View style={[styles.customIcon, { width: size, height: size }]}>
  <Text style={[styles.iconText, { fontSize: size * 0.9, color }]}>★</Text>
</View>
);

const PeopleIcon = ({ size = 14, color = '#6b7280' }) => (
<View style={[styles.customIcon, { width: size, height: size }]}>
  <Text style={[styles.iconText, { fontSize: size * 0.8, color }]}>👥</Text>
</View>
);

const TimeIcon = ({ size = 14, color = '#6b7280' }) => (
<View style={[styles.customIcon, { width: size, height: size }]}>
  <Text style={[styles.iconText, { fontSize: size * 0.8, color }]}>⏰</Text>
</View>
);

export default function CoursesScreen({ navigation, route }: any) {
const { courses, searchCourses, getCoursesByCategory } = useCourses();
const { enrolledCourses, enrollInCourse } = useUser();
const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-learning'
const [filter, setFilter] = useState('all');
const [searchQuery, setSearchQuery] = useState('');
const [results, setResults] = useState(courses);
const [showCategories, setShowCategories] = useState(true);
const [showSearchBar, setShowSearchBar] = useState(false);
const [showRecentSearches, setShowRecentSearches] = useState(false);
const [recentSearches, setRecentSearches] = useState([
  'React Native',
  'Machine Learning',
  'UI/UX Design',
  'Python',
]);

const tabs = [
  { id: 'browse', label: 'Browse Courses', icon: '🌟' },
  { id: 'my-learning', label: 'My Learning', icon: '📚' },
];

const filters = [
  { id: 'all', label: 'All Courses' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const myLearningFilters = [
  { id: 'enrolled', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'wishlist', label: 'Wishlist' },
];

const categories = [
  { name: 'Programming', icon: '💻', color: '#3b82f6', description: 'Web & Mobile Development' },
  { name: 'Design', icon: '🎨', color: '#8b5cf6', description: 'UI/UX & Graphic Design' },
  { name: 'Business', icon: '📈', color: '#10b981', description: 'Marketing & Entrepreneurship' },
  { name: 'Photography', icon: '📷', color: '#f59e0b', description: 'Digital & Portrait Photography' },
  { name: 'Music', icon: '🎵', color: '#ef4444', description: 'Music Production & Theory' },
  { name: 'Data Science', icon: '📊', color: '#06b6d4', description: 'Analytics & Machine Learning' },
];

const numColumns = screenWidth > 768 ? 3 : 2;

const handleCategorySearch = (category: string) => {
  const categoryResults = getCoursesByCategory(category);
  setResults(categoryResults);
  setSearchQuery('');
  setFilter('all');
  setShowCategories(false);
  setActiveTab('browse');
  setShowSearchBar(false);
  setShowRecentSearches(false);
};

useEffect(() => {
  if (route.params?.category) {
    handleCategorySearch(route.params.category);
    setShowCategories(false);
    setActiveTab('browse');
  }
}, [route.params]);

const handleSearch = (query: string) => {
  setSearchQuery(query);
  setShowCategories(false);
  
  if (query.trim()) {
    const searchResults = searchCourses(query);
    setResults(searchResults);

    // Update recent searches
    const updatedSearches = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updatedSearches);
  } else {
    setResults(courses);
    setShowCategories(true);
  }
};

const clearSearch = () => {
  setSearchQuery('');
  setResults(courses);
  setShowCategories(true);
  setFilter('all');
  setShowSearchBar(false);
  setShowRecentSearches(false);
};

const handleSearchBarFocus = () => {
  setShowRecentSearches(true);
};

const getFilteredCourses = () => {
  let coursesToFilter = results;

  if (activeTab === 'my-learning') {
    switch (filter) {
      case 'enrolled':
        return coursesToFilter.filter(course => enrolledCourses.includes(course.id));
      case 'completed':
        // This would need completion tracking - for now return empty
        return [];
      case 'wishlist':
        // This would need wishlist tracking - for now return empty
        return [];
      default:
        return coursesToFilter.filter(course => enrolledCourses.includes(course.id));
    }
  }

  // Browse tab filters
  switch (filter) {
    case 'beginner':
    case 'intermediate':
    case 'advanced':
      return coursesToFilter.filter(course => course.level.toLowerCase() === filter);
    default:
      return coursesToFilter;
  }
};

const filteredCourses = getFilteredCourses();

const getEmptyStateMessage = () => {
  if (activeTab === 'my-learning') {
    switch (filter) {
      case 'enrolled':
        return {
          title: "No enrolled courses yet",
          subtitle: "Start your learning journey by enrolling in a course",
          action: "Browse Courses",
          icon: "📚"
        };
      case 'completed':
        return {
          title: "No completed courses yet",
          subtitle: "Keep learning to see your achievements here",
          action: "Continue Learning",
          icon: "🏆"
        };
      case 'wishlist':
        return {
          title: "Your wishlist is empty",
          subtitle: "Save courses you're interested in for later",
          action: "Browse Courses",
          icon: "❤️"
        };
    }
  }

  if (searchQuery.trim() !== '') {
    return {
      title: "No courses found",
      subtitle: `No courses match "${searchQuery}". Try different keywords.`,
      action: "Clear Search",
      icon: "🔍"
    };
  }

  return {
    title: "No courses found",
    subtitle: "Try adjusting your filters or browse all courses",
    action: "View All Courses",
    icon: "📚"
  };
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'Beginner': return ['#dcfce7', '#16a34a'];
    case 'Intermediate': return ['#fef3c7', '#d97706'];
    case 'Advanced': return ['#fee2e2', '#dc2626'];
    default: return ['#f3f4f6', '#6b7280'];
  }
};

const renderTab = ({ item }: any) => {
  const isActive = activeTab === item.id;
  
  return (
    <TouchableOpacity
      style={[styles.tab, isActive && styles.activeTab]}
      onPress={() => {
        setActiveTab(item.id);
        setFilter(item.id === 'my-learning' ? 'enrolled' : 'all');
        setShowCategories(item.id === 'browse' && searchQuery.trim() === '');
      }}
      activeOpacity={0.7}
    >
      {isActive ? (
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeTabGradient}
        >
          <Text style={styles.tabIcon}>{item.icon}</Text>
          <Text style={styles.activeTabText}>{item.label}</Text>
        </LinearGradient>
      ) : (
        <>
          <Text style={styles.tabIcon}>{item.icon}</Text>
          <Text style={[styles.tabText, { minWidth: 80 }]}>{item.label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const renderCourse = ({ item }: any) => {
  const [levelBg, levelText] = getLevelColor(item.level);
  const isEnrolled = enrolledCourses.includes(item.id);
  
  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.imageOverlay}
        />
        {isEnrolled && (
          <View style={styles.enrolledBadge}>
            <Text style={styles.enrolledBadgeText}>Enrolled</Text>
          </View>
        )}
      </View>
      
      <View style={styles.courseInfo}>
        <View style={styles.courseHeader}>
          <Text style={styles.category}>{item.category}</Text>
          <View style={[styles.levelBadge, { backgroundColor: levelBg }]}>
            <Text style={[styles.level, { color: levelText }]}>
              {item.level}
            </Text>
          </View>
        </View>
        
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.instructor}>by {item.instructor}</Text>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <StarIcon size={14} color="#fbbf24" />
            <Text style={styles.statText}>{item.rating}</Text>
          </View>
          <View style={styles.stat}>
            <PeopleIcon size={14} color="#6b7280" />
            <Text style={styles.statText}>{item.students.toLocaleString()}</Text>
          </View>
          <View style={styles.stat}>
            <TimeIcon size={14} color="#6b7280" />
            <Text style={styles.statText}>{item.duration}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.pricing}>
            {item.price === 0 ? (
              <Text style={styles.freePrice}>Free</Text>
            ) : (
              <>
                <Text style={styles.price}>${item.price}</Text>
                {item.originalPrice && (
                  <Text style={styles.originalPrice}>${item.originalPrice}</Text>
                )}
              </>
            )}
          </View>
          {isEnrolled ? (
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.enrollButton}
              onPress={() => enrollInCourse(item.id)}
            >
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.enrollButtonText}>Enroll Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const renderFilterChip = ({ item }: any) => {
  const isActive = filter === item.id;
  
  return (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.activeFilterChip]}
      onPress={() => setFilter(item.id)}
      activeOpacity={0.7}
    >
      {isActive ? (
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeChipGradient}
        >
          <Text style={styles.activeFilterText}>{item.label}</Text>
        </LinearGradient>
      ) : (
        <Text style={styles.filterText}>{item.label}</Text>
      )}
    </TouchableOpacity>
  );
};

const renderCategory = ({ item }: any) => (
  <TouchableOpacity
    style={[styles.categoryCard, { borderLeftColor: item.color }]}
    onPress={() => handleCategorySearch(item.name)}
    activeOpacity={0.8}
  >
    <View style={styles.categoryContent}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <View style={styles.categoryText}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryDescription} numberOfLines={2}>{item.description}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const renderRecentSearch = ({ item }: any) => (
  <TouchableOpacity 
    style={styles.recentSearchItem} 
    onPress={() => handleSearch(item)}
    activeOpacity={0.7}
  >
    <View style={styles.recentSearchContent}>
      <Text style={styles.recentSearchIcon}>🕒</Text>
      <Text style={styles.recentSearchText}>{item}</Text>
      <TouchableOpacity
        onPress={() => setRecentSearches(recentSearches.filter((s) => s !== item))}
        style={styles.removeRecentButton}
      >
        <Text style={styles.removeRecentText}>×</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

const renderEmptyState = () => {
  const emptyState = getEmptyStateMessage();
  
  return (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateIcon}>{emptyState.icon}</Text>
      <Text style={styles.emptyStateTitle}>{emptyState.title}</Text>
      <Text style={styles.emptyStateSubtitle}>{emptyState.subtitle}</Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => {
          if (searchQuery.trim() !== '') {
            clearSearch();
          } else if (activeTab === 'my-learning') {
            setActiveTab('browse');
            setShowCategories(true);
          } else {
            setFilter('all');
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyStateButtonGradient}
        >
          <Text style={styles.emptyStateButtonText}>{emptyState.action}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const currentFilters = activeTab === 'my-learning' ? myLearningFilters : filters;

return (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    
    {/* Background */}
    <LinearGradient
      colors={['rgba(59, 130, 246, 0.02)', 'rgba(147, 51, 234, 0.02)', 'transparent']}
      style={styles.backgroundGradient}
    />

    {/* Header with Tabs */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Learning Hub</Text>
      <Text style={styles.headerSubtitle}>Discover and track your progress</Text>
      
      <FlatList
        data={tabs}
        renderItem={renderTab}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsList}
        contentContainerStyle={styles.tabsContainer}
      />
    </View>

    {/* Search Toggle and Bar */}
    {!showSearchBar ? (
      <View style={styles.searchToggleContainer}>
        <TouchableOpacity 
          style={styles.searchToggleButton}
          onPress={() => setShowSearchBar(true)}
          activeOpacity={0.7}
        >
          <SearchIcon size={20} color="#3B82F6" />
          <Text style={styles.searchToggleText}>Search courses...</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses, instructors, topics..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={handleSearchBarFocus}
          autoFocus
        />
        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Content */}
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Categories Section - only show on browse tab with no search */}
      {activeTab === 'browse' && showCategories && !showSearchBar && (
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.name}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.categoryRow}
          />
        </View>
      )}

      {/* Recent Searches - only show when search bar is focused */}
      {showRecentSearches && recentSearches.length > 0 && (
        <View style={styles.recentSearchesSection}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearch}
            keyExtractor={(item) => item}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Filters and Courses */}
      {(!showCategories || activeTab === 'my-learning' || showSearchBar) && !showRecentSearches && (
        <>
          <View style={styles.filtersSection}>
            <FlatList
              data={currentFilters}
              renderItem={renderFilterChip}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
            />
          </View>

          {/* Results Summary */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} found
            </Text>
            {searchQuery.trim() !== '' && (
              <TouchableOpacity onPress={clearSearch}>
                <Text style={styles.clearResultsText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Courses Grid or Empty State */}
          {filteredCourses.length > 0 ? (
            <FlatList
              data={filteredCourses}
              renderItem={renderCourse}
              keyExtractor={(item) => item.id}
              numColumns={screenWidth > 768 ? 2 : 1}
              key={`courses-${screenWidth > 768 ? 2 : 1}`}
              scrollEnabled={false}
              contentContainerStyle={styles.coursesGrid}
            />
          ) : (
            renderEmptyState()
          )}
        </>
      )}
    </ScrollView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#ffffff',
},
backgroundGradient: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
header: {
  paddingHorizontal: 20,
  paddingTop: 16,
  paddingBottom: 12,
  backgroundColor: 'transparent',
},
headerTitle: {
  fontSize: screenWidth > 480 ? 32 : 28,
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: 4,
},
headerSubtitle: {
  fontSize: 16,
  color: '#6b7280',
  marginBottom: 20,
},
tabsList: {
  marginBottom: 8,
},
tabsContainer: {
  paddingBottom: 8,
},
tab: {
  paddingHorizontal: 20,
  paddingVertical: 0,
  marginRight: 12,
  borderRadius: 25,
  backgroundColor: '#f8fafc',
  borderWidth: 1,
  borderColor: '#e2e8f0',
  flexDirection: 'row',
  alignItems: 'center',
},
activeTab: {
  backgroundColor: 'transparent',
  borderColor: 'transparent',
},
activeTabGradient: {
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 25,
  flexDirection: 'row',
  alignItems: 'center',
},
tabIcon: {
  fontSize: 16,
  marginRight: 8,
},
tabText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#6b7280',
  minWidth: 80,
  textAlign: 'center',
},
activeTabText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#ffffff',
  minWidth: 80,
  textAlign: 'center',
},
searchToggleContainer: {
  paddingHorizontal: 20,
  marginBottom: 20,
},
searchToggleButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},
searchToggleText: {
  marginLeft: 12,
  fontSize: 16,
  color: '#9CA3AF',
},
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  marginHorizontal: 20,
  marginBottom: 20,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 4,
  borderWidth: 1,
  borderColor: 'rgba(59, 130, 246, 0.1)',
},
searchInput: {
  flex: 1,
  marginLeft: 12,
  fontSize: 16,
  color: '#1f2937',
},
clearButton: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: '#f3f4f6',
  alignItems: 'center',
  justifyContent: 'center',
},
clearButtonText: {
  fontSize: 18,
  color: '#6b7280',
  fontWeight: 'bold',
},
content: {
  flex: 1,
},
categoriesSection: {
  paddingHorizontal: 20,
  paddingBottom: 20,
},
categoryRow: {
  justifyContent: 'space-between',
  paddingHorizontal: 4,
},
sectionTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: 16,
},
categoryCard: {
  backgroundColor: '#ffffff',
  marginBottom: 12,
  marginHorizontal: 4,
  borderRadius: 16,
  borderLeftWidth: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  flex: 0.48,
},
categoryContent: {
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: 16,
},
categoryIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
  alignSelf: 'center',
},
categoryEmoji: {
  fontSize: 20,
},
categoryText: {
  alignItems: 'center',
  width: '100%',
},
categoryName: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: 4,
  textAlign: 'center',
},
categoryDescription: {
  fontSize: 12,
  color: '#6b7280',
  textAlign: 'center',
  lineHeight: 16,
},
recentSearchesSection: {
  paddingHorizontal: 20,
  paddingBottom: 20,
},
recentSearchItem: {
  marginBottom: 8,
},
recentSearchContent: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: '#f8fafc',
  borderRadius: 12,
},
recentSearchIcon: {
  fontSize: 14,
  marginRight: 12,
},
recentSearchText: {
  flex: 1,
  fontSize: 14,
  color: '#374151',
},
removeRecentButton: {
  width: 20,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
removeRecentText: {
  fontSize: 18,
  color: '#9ca3af',
},
filtersSection: {
  marginBottom: 16,
},
filtersContainer: {
  paddingHorizontal: 20,
},
filterChip: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: '#f8fafc',
  marginRight: 12,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},
activeFilterChip: {
  backgroundColor: 'transparent',
  borderColor: 'transparent',
},
activeChipGradient: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
filterText: {
  fontSize: 14,
  color: '#6b7280',
  fontWeight: '600',
},
activeFilterText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
},
resultsHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  marginBottom: 16,
},
resultsCount: {
  fontSize: 16,
  fontWeight: '600',
  color: '#374151',
},
clearResultsText: {
  fontSize: 14,
  color: '#3B82F6',
  fontWeight: '600',
},
coursesGrid: {
  paddingHorizontal: 20,
  paddingBottom: 100,
},
courseCard: {
  backgroundColor: '#ffffff',
  borderRadius: 20,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
  elevation: 8,
  borderWidth: 1,
  borderColor: 'rgba(59, 130, 246, 0.08)',
  flex: screenWidth > 768 ? 0.48 : 1,
  marginRight: screenWidth > 768 ? 20 : 0,
},
imageContainer: {
  position: 'relative',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  overflow: 'hidden',
},
thumbnail: {
  width: '100%',
  height: 200,
},
imageOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 60,
},
enrolledBadge: {
  position: 'absolute',
  top: 12,
  right: 12,
  backgroundColor: '#10b981',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
},
enrolledBadgeText: {
  fontSize: 12,
  fontWeight: 'bold',
  color: '#ffffff',
},
courseInfo: {
  padding: 20,
},
courseHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
category: {
  fontSize: 12,
  color: '#3B82F6',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
levelBadge: {
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 6,
},
level: {
  fontSize: 11,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
title: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: 8,
  lineHeight: 24,
},
instructor: {
  fontSize: 14,
  color: '#6b7280',
  marginBottom: 16,
  fontWeight: '500',
},
stats: {
  flexDirection: 'row',
  marginBottom: 20,
  flexWrap: 'wrap',
},
stat: {
  flexDirection: 'row',
  alignItems: 'center',
  marginRight: 16,
  marginBottom: 4,
},
statText: {
  fontSize: 12,
  color: '#6b7280',
  marginLeft: 6,
  fontWeight: '500',
},
footer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
pricing: {
  flexDirection: 'row',
  alignItems: 'center',
},
price: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1f2937',
},
freePrice: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#10b981',
},
originalPrice: {
  fontSize: 14,
  color: '#9ca3af',
  textDecorationLine: 'line-through',
  marginLeft: 8,
  fontWeight: '500',
},
enrollButton: {
  borderRadius: 12,
  overflow: 'hidden',
},
continueButton: {
  borderRadius: 12,
  overflow: 'hidden',
},
buttonGradient: {
  paddingHorizontal: 20,
  paddingVertical: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
enrollButtonText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
  letterSpacing: 0.5,
},
continueButtonText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
  letterSpacing: 0.5,
},
emptyStateContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 60,
  paddingHorizontal: 40,
},
emptyStateIcon: {
  fontSize: 64,
  marginBottom: 24,
},
emptyStateTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#1f2937',
  textAlign: 'center',
  marginBottom: 12,
},
emptyStateSubtitle: {
  fontSize: 16,
  color: '#6b7280',
  textAlign: 'center',
  marginBottom: 32,
  lineHeight: 24,
},
emptyStateButton: {
  borderRadius: 12,
  overflow: 'hidden',
},
emptyStateButtonGradient: {
  paddingHorizontal: 32,
  paddingVertical: 16,
  alignItems: 'center',
  justifyContent: 'center',
},
emptyStateButtonText: {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: '600',
},
customIcon: {
  alignItems: 'center',
  justifyContent: 'center',
},
iconText: {
  textAlign: 'center',
},
});