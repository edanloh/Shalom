import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import FeaturedCourses from '../components/FeaturedCourses';
import Stats from '../components/Stats';
import Footer from '../components/Footer';

const HomeScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <Header />
        <Hero />
        <Categories />
        <FeaturedCourses />
        <Stats />
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
});

export default HomeScreen;


