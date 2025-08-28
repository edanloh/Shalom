import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = () => {
  return (
    <View style={styles.header}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Ionicons name="book-outline" size={20} color="#fff" />
        </View>
        <Text style={styles.title}>LearnHub</Text>
      </View>

      {/* Search Bar - visible on tablet/web */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={16}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search courses..."
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navContainer}>
        <TouchableOpacity style={[styles.navButton, styles.hiddenOnMobile]}>
          <Text style={styles.navButtonText}>Browse Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, styles.hiddenOnMobile]}>
          <Text style={styles.navButtonText}>Teach</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, styles.outlineButton]}>
          <Text style={styles.outlineButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, styles.heroButton]}>
          <Text style={styles.heroButtonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Mobile Menu */}
        <TouchableOpacity style={[styles.navButton, styles.iconButton]}>
          <Ionicons name="menu-outline" size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Platform.OS === 'web' ? 'rgba(248,250,252,0.95)' : '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchContainer: {
    flex: 1,
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    display: Platform.OS === 'web' ? 'flex' : 'none', // hide on mobile
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 14,
    color: '#1f2937',
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 14,
    color: '#1f2937',
  },
  hiddenOnMobile: {
    display: Platform.OS === 'web' ? 'flex' : 'none',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  outlineButtonText: {
    color: '#8B5CF6',
    fontWeight: '500',
  },
  heroButton: {
    backgroundColor: '#8B5CF6',
  },
  heroButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
});
