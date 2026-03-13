import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";

const Hero = () => {
  return (
    <ScrollView testID="hero-scroll" contentContainerStyle={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        {/* Badge */}
        <View style={styles.badge}>
          <FontAwesome name="star" size={16} color="#F59E0B" />
          <Text style={styles.badgeText}>#1 Learning Platform</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Learn <Text style={styles.gradientText}>Anything</Text> Online
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Discover thousands of courses from expert instructors. Master new
          skills at your own pace with our interactive learning platform.
        </Text>

        {/* CTA Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity testID="cta-primary" style={[styles.button, styles.primaryButton]}>
            <Ionicons
              name="play"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Start Learning Free</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="cta-secondary" style={[styles.button, styles.outlineButton]}>
            <Text style={[styles.buttonText, { color: "#8B5CF6" }]}>
              Browse Courses
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color="#8B5CF6" />
            <Text style={styles.statValue}>10M+</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="menu-book" size={20} color="#8B5CF6" />
            <Text style={styles.statValue}>50K+</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statItem}>
            <FontAwesome name="star" size={20} color="#F59E0B" />
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Hero Image */}
      <View style={styles.imageWrapper}>
        <Image
          testID="hero-image"
          source={require("@assets/hero-image.jpg")}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Floating Elements */}
        <View style={[styles.floatingBadge, { top: -10, right: -10 }]}>
          <View style={styles.dot} />
          <Text style={styles.floatingText}>Live Classes</Text>
        </View>

        <View style={[styles.floatingBadge, { bottom: -10, left: -10 }]}>
          <FontAwesome name="star" size={16} color="#F59E0B" />
          <Text style={styles.floatingText}>Expert Instructors</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default Hero;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 1200,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139,92,246,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 16,
  },
  badgeText: {
    marginLeft: 6,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  gradientText: {
    color: "#8B5CF6",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    maxWidth: 600,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    margin: 4,
  },
  primaryButton: {
    backgroundColor: "#8B5CF6",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#8B5CF6",
    backgroundColor: "transparent",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    flexWrap: "wrap",
    marginBottom: 40,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  imageWrapper: {
    width: "100%",
    maxWidth: 600,
    marginTop: 20,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 300,
    borderRadius: 24,
  },
  floatingBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "green",
    marginRight: 6,
  },
  floatingText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
