import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Footer = () => {
  const footerLinks = {
    Company: [
      { name: 'About Us', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Blog', href: '#' },
    ],
    Courses: [
      { name: 'Web Development', href: '#' },
      { name: 'Data Science', href: '#' },
      { name: 'Design', href: '#' },
      { name: 'Business', href: '#' },
    ],
    Support: [
      { name: 'Help Center', href: '#' },
      { name: 'Contact Us', href: '#' },
      { name: 'System Status', href: '#' },
      { name: 'Security', href: '#' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
      { name: 'Accessibility', href: '#' },
    ],
  };

  const socialLinks = [
    { name: 'logo-facebook', href: '#', label: 'Facebook' },
    { name: 'logo-twitter', href: '#', label: 'Twitter' },
    { name: 'logo-instagram', href: '#', label: 'Instagram' },
    { name: 'logo-linkedin', href: '#', label: 'LinkedIn' },
    { name: 'logo-youtube', href: '#', label: 'YouTube' },
  ];

  const handlePress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Logo & Description */}
        <View style={styles.logoSection}>
          <View style={styles.logo}>
            <Ionicons name="book-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.title}>LearnHub</Text>
          <Text style={styles.description}>
            Empowering millions of learners worldwide with high-quality, accessible education. Learn new skills, advance your career, and achieve your goals.
          </Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((social) => (
              <TouchableOpacity
                key={social.label}
                onPress={() => handlePress(social.href)}
                style={styles.socialButton}
              >
                <Ionicons name={social.name as any} size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer Links */}
        <View style={styles.linksContainer}>
          {Object.entries(footerLinks).map(([category, links]) => (
            <View key={category} style={styles.linkSection}>
              <Text style={styles.linkTitle}>{category}</Text>
              {links.map((link) => (
                <TouchableOpacity key={link.name} onPress={() => handlePress(link.href)}>
                  <Text style={styles.linkText}>{link.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.bottomText}>© 2024 LearnHub. All rights reserved.</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.bottomText}>English</Text>
            <Text style={styles.bottomText}>USD $</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Footer;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937', // dark foreground
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 2,
    maxWidth: 300,
    marginBottom: 24,
  },
  logo: {
    width: 32,
    height: 32,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  description: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  linksContainer: {
    flex: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 24,
    marginBottom: 24,
  },
  linkSection: {
    marginBottom: 16,
    minWidth: 120,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 16,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  bottomText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 16,
  },
});
