import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

const stats = [
  {
    icon: <Ionicons name="people" size={32} color="#fff" />,
    value: "10M+",
    label: "Active Students",
    description: "Learning worldwide",
  },
  {
    icon: <MaterialIcons name="menu-book" size={32} color="#fff" />,
    value: "50K+",
    label: "Online Courses",
    description: "In various topics",
  },
  {
    icon: <FontAwesome name="trophy" size={32} color="#fff" />,
    value: "15K+",
    label: "Expert Instructors",
    description: "Teaching students",
  },
  {
    icon: <Ionicons name="globe-outline" size={32} color="#fff" />,
    value: "190+",
    label: "Countries",
    description: "Students enrolled",
  },
];

const Stats = () => {
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 768 ? 4 : 2; // responsive columns

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trusted by Millions Worldwide</Text>
        <Text style={styles.subtitle}>
          Join our global community of learners and instructors
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={[styles.grid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {stats.map((stat, index) => (
          <TouchableOpacity key={index} activeOpacity={0.8} style={[styles.statItem, { width: `${100 / numColumns}%` }]}>
            <View style={styles.iconWrapper}>{stat.icon}</View>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
            <Text style={styles.description}>{stat.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default Stats;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#8B5CF6', // gradient-primary fallback
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    maxWidth: 600,
    textAlign: 'center',
    marginTop: 8,
  },
  grid: {
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 999,
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
});
