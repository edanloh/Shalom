import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const categories = [
  { icon: <Ionicons name="code-slash" size={28} color="#2563EB" />, name: "Programming", courses: "2,500+ courses", bgColor: "#DBEAFE" },
  { icon: <MaterialCommunityIcons name="palette" size={28} color="#7C3AED" />, name: "Design", courses: "1,800+ courses", bgColor: "#EDE9FE" },
  { icon: <MaterialCommunityIcons name="chart-bar" size={28} color="#059669" />, name: "Business", courses: "3,200+ courses", bgColor: "#D1FAE5" },
  { icon: <Ionicons name="camera-outline" size={28} color="#DB2777" />, name: "Photography", courses: "900+ courses", bgColor: "#FCE7F3" },
  { icon: <Ionicons name="musical-notes-outline" size={28} color="#F97316" />, name: "Music", courses: "750+ courses", bgColor: "#FFEDD5" },
  { icon: <Ionicons name="briefcase-outline" size={28} color="#DC2626" />, name: "Marketing", courses: "1,400+ courses", bgColor: "#FEE2E2" },
  { icon: <MaterialCommunityIcons name="cpu-64-bit" size={28} color="#4F46E5" />, name: "Data Science", courses: "1,100+ courses", bgColor: "#E0E7FF" },
  { icon: <MaterialCommunityIcons name="translate" size={28} color="#0D9488" />, name: "Languages", courses: "2,000+ courses", bgColor: "#CCFBF1" },
];

const Categories = () => {
  const screenWidth = Dimensions.get('window').width;
  const numColumns = Platform.OS === 'web' 
    ? (screenWidth > 1200 ? 4 : screenWidth > 768 ? 3 : 2)
    : 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Categories</Text>
        <Text style={styles.subtitle}>Find the perfect course in your field of interest</Text>
      </View>

      <FlatList
        testID="categories-list"
        data={categories}
        key={numColumns}
        keyExtractor={(item) => item.name}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} style={styles.categoryButton}>
            <View style={[styles.iconWrapper, { backgroundColor: item.bgColor }]}>
              {item.icon}
            </View>
            <View style={styles.textWrapper}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.courses}>{item.courses}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default Categories;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
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
  listContainer: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    minHeight: 120,
  },
  iconWrapper: {
    padding: 16,
    borderRadius: 999,
    marginBottom: 12,
  },
  textWrapper: {
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
  },
  courses: {
    fontSize: 12,
    color: '#6B7280',
  },
});