import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
  TextInput,
  FlatList,
  Easing,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

interface Course {
  id: number;
  title: string;
  description: string;
  image: string;
  instructor: string;
  instructorImage: string;
  modulesCompleted: number;
  totalModules: number;
  completionPercentage: number;
  totalHours: number;
  category: string;
  difficulty: string;
  rating: number;
  lastAccessed: string;
}

interface Achievement {
  id: number;
  title: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
}

interface CourseCardProps {
  course: Course;
  index: number;
  currentIndex: number;
  onSwipe: (direction: "left" | "right") => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const cardWidth = screenWidth * 0.9;
const cardHeight = screenHeight * 0.65;

const HomeScreen: React.FC = () => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");

  const user = {
    name: "James Lee",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face",
    streak: 12,
    totalPoints: 2840,
    weeklyGoal: 15,
    hoursThisWeek: 12,
    level: "Advanced Learner",
  };

  const courses: Course[] = [
    {
      id: 1,
      title: "Advanced AI & Machine Learning",
      description: "Deep dive into neural networks and advanced ML techniques",
      image:
        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop",
      instructor: "Dr. Sarah Chen",
      instructorImage:
        "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=60&h=60&fit=crop&crop=face",
      modulesCompleted: 8,
      totalModules: 12,
      completionPercentage: 67,
      totalHours: 35,
      category: "AI/ML",
      difficulty: "Advanced",
      rating: 4.9,
      lastAccessed: "2 hours ago",
    },
    {
      id: 2,
      title: "Full-Stack Development Mastery",
      description: "Build complete web applications from frontend to backend",
      image:
        "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=300&fit=crop",
      instructor: "Marcus Rodriguez",
      instructorImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face",
      modulesCompleted: 15,
      totalModules: 20,
      completionPercentage: 75,
      totalHours: 42,
      category: "Web Dev",
      difficulty: "Intermediate",
      rating: 4.8,
      lastAccessed: "1 day ago",
    },
    {
      id: 3,
      title: "Data Visualization & Analytics",
      description:
        "Create stunning visualizations and extract insights from data",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
      instructor: "Dr. Emily Watson",
      instructorImage:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face",
      modulesCompleted: 6,
      totalModules: 10,
      completionPercentage: 60,
      totalHours: 28,
      category: "Data Science",
      difficulty: "Intermediate",
      rating: 4.7,
      lastAccessed: "3 days ago",
    },
  ];

  const achievements: Achievement[] = [
    { id: 1, title: "Week Warrior", icon: "🔥", unlocked: true },
    { id: 2, title: "Course Crusher", icon: "🏆", unlocked: true },
    {
      id: 3,
      title: "Speed Learner",
      icon: "⚡",
      unlocked: false,
      progress: 75,
    },
    {
      id: 4,
      title: "Knowledge Master",
      icon: "🧠",
      unlocked: false,
      progress: 45,
    },
  ];

  const recommendedCourses = [
    {
      id: 4,
      title: "Advanced Python for AI",
      image:
        "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=300&h=200&fit=crop",
      rating: 4.9,
      students: "12.5k",
      duration: "25h",
    },
    {
      id: 5,
      title: "Cloud Architecture",
      image:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&h=200&fit=crop",
      rating: 4.8,
      students: "8.2k",
      duration: "18h",
    },
  ];

  const upcomingSessions = [
    {
      id: 1,
      title: "Neural Networks Deep Dive",
      time: "Today, 3:00 PM",
      type: "Live Session",
    },
    {
      id: 2,
      title: "Project Review",
      time: "Tomorrow, 10:00 AM",
      type: "Assignment Due",
    },
  ];

  const categories = [
    "All",
    "AI/ML",
    "Web Dev",
    "Data Science",
    "Mobile",
    "DevOps",
  ];

  const overallProgress = Math.round(
    courses.reduce((acc, course) => acc + course.completionPercentage, 0) /
      courses.length
  );

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right") {
      console.log("Course bookmarked!");
    } else {
      console.log("Course skipped!");
    }
    setCurrentCardIndex((prev) => {
      if (direction === "right") {
        return (prev + 1) % courses.length;
      } else {
        return (prev - 1 + courses.length) % courses.length;
      }
    });
  };

  const renderRecommendedCourse = ({
    item,
  }: {
    item: (typeof recommendedCourses)[0];
  }) => (
    <TouchableOpacity style={styles.recommendedCard}>
      <Image source={{ uri: item.image }} style={styles.recommendedImage} />
      <BlurView intensity={20} style={styles.recommendedContent}>
        <Text style={styles.recommendedTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.recommendedStats}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.studentsText}>{item.students}</Text>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        item === "All" && styles.activeCategoryButton,
      ]}
    >
      <Text
        style={[
          styles.categoryText,
          item === "All" && styles.activeCategoryText,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating Background Elements */}
      <View style={styles.backgroundElements}>
        <View style={[styles.floatingElement, styles.element1]} />
        <View style={[styles.floatingElement, styles.element2]} />
        <View style={[styles.floatingElement, styles.element3]} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BlurView intensity={20} style={styles.pointsContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.pointsText}>{user.totalPoints}</Text>
            </BlurView>
            <BlurView intensity={20} style={styles.streakContainer}>
              <Ionicons name="flame" size={16} color="#FF6B35" />
              <Text style={styles.streakText}>{user.streak} day streak</Text>
            </BlurView>
          </View>
          <TouchableOpacity>
            <BlurView intensity={20} style={styles.notificationButton}>
              <Ionicons name="notifications" size={24} color="#6366f1" />
              <View style={styles.notificationBadge} />
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <BlurView intensity={15} style={styles.heroSection}>
          <View style={styles.profileSection}>
            <Image source={{ uri: user.avatar }} style={styles.profileImage} />
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userLevel}>{user.level}</Text>
            </View>
          </View>

          {/* Overall Progress */}
          <View style={styles.overallProgress}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Overall Progress</Text>
              <Text style={styles.progressPercentage}>{overallProgress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={["#6366f1", "#8b5cf6", "#ec4899"]}
                style={[styles.progressBar, { width: `${overallProgress}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>

          {/* Continue Learning Button */}
          <TouchableOpacity>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              style={styles.continueButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.continueButtonText}>Continue Learning</Text>
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>

        {/* Search Bar */}
        <BlurView intensity={15} style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses, topics, or instructors..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </BlurView>

        {/* Weekly Goal */}
        <BlurView intensity={15} style={styles.weeklyGoalContainer}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleContainer}>
              <Ionicons name="ellipse-outline" size={20} color="#10b981" />
              <Text style={styles.goalTitle}>Weekly Goal</Text>
            </View>
            <Text style={styles.goalProgress}>
              {user.hoursThisWeek}/{user.weeklyGoal}h
            </Text>
          </View>
          <View style={styles.goalProgressContainer}>
            <LinearGradient
              colors={["#10b981", "#3b82f6"]}
              style={[
                styles.goalProgressBar,
                { width: `${(user.hoursThisWeek / user.weeklyGoal) * 100}%` },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.goalSubtext}>
            {user.weeklyGoal - user.hoursThisWeek} hours to reach your goal
          </Text>
        </BlurView>

        {/* Pick Up Where You Left Off */}
        <BlurView intensity={15} style={styles.pickupSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
                style={styles.sectionIcon}
              >
                <Ionicons name="play" size={16} color="white" />
              </LinearGradient>
              <View>
                <Text style={styles.sectionTitle}>
                  Pick up where you left off
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Continue your learning journey
                </Text>
              </View>
            </View>
          </View>

          <BlurView intensity={10} style={styles.pickupCard}>
            <Text style={styles.pickupCourseTitle}>{courses[0].title}</Text>
            <Text style={styles.pickupModuleTitle}>
              Module 9: Neural Network Optimization
            </Text>
            <View style={styles.pickupProgress}>
              <View style={styles.pickupProgressBar}>
                <LinearGradient
                  colors={["#6366f1", "#8b5cf6"]}
                  style={[styles.pickupProgressFill, { width: "67%" }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.pickupTimeLeft}>15 min left</Text>
            </View>
          </BlurView>
        </BlurView>

        {/* Current Courses Dashboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitleLarge}>Current Courses</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {courses.slice(0, 2).map((course) => (
            <TouchableOpacity key={course.id}>
              <BlurView intensity={15} style={styles.courseCard}>
                <Image
                  source={{ uri: course.image }}
                  style={styles.courseCardImage}
                />
                <View style={styles.courseCardContent}>
                  <Text style={styles.courseCardTitle} numberOfLines={1}>
                    {course.title}
                  </Text>
                  <Text style={styles.courseCardInstructor}>
                    {course.instructor}
                  </Text>
                  <View style={styles.courseCardProgress}>
                    <View style={styles.courseCardProgressBar}>
                      <LinearGradient
                        colors={["#6366f1", "#8b5cf6"]}
                        style={[
                          styles.courseCardProgressFill,
                          { width: `${course.completionPercentage}%` },
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={styles.courseCardPercentage}>
                      {course.completionPercentage}%
                    </Text>
                  </View>
                  <Text style={styles.courseCardLastAccessed}>
                    Last accessed: {course.lastAccessed}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="rgba(255,255,255,0.4)"
                />
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleLarge}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <BlurView
                key={achievement.id}
                intensity={15}
                style={[
                  styles.achievementCard,
                  achievement.unlocked && styles.achievementUnlocked,
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                {achievement.unlocked ? (
                  <View style={styles.unlockedBadge}>
                    <Ionicons name="trophy" size={12} color="#fbbf24" />
                    <Text style={styles.unlockedText}>Unlocked!</Text>
                  </View>
                ) : (
                  <View style={styles.achievementProgressContainer}>
                    <LinearGradient
                      colors={["#fbbf24", "#f59e0b"]}
                      style={[
                        styles.achievementProgress,
                        typeof achievement.progress === "number"
                          ? {
                              width: `${achievement.progress}%` as `${number}%`,
                            }
                          : { width: "0%" as `${number}%` },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                )}
              </BlurView>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleLarge}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />
        </View>

        {/* Discover New Courses - Tinder Style Swiping */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleLarge}>Discover New Courses</Text>
          <Text style={styles.discoverSubtitle}>
            Swipe right to bookmark, left to skip
          </Text>

          <View style={styles.cardStack}>
            {/* Always show prev, current, next as a loop */}
            {(() => {
              const prevIndex = (currentCardIndex - 1 + courses.length) % courses.length;
              const nextIndex = (currentCardIndex + 1) % courses.length;
              const indices = [prevIndex, currentCardIndex, nextIndex];
              return indices.map((i) => (
                <CourseCard
                  key={courses[i].id}
                  course={courses[i]}
                  index={i}
                  currentIndex={currentCardIndex}
                  onSwipe={handleSwipe}
                />
              ));
            })()}
          </View>
        </View>

        {/* Recommended Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitleLarge}>Recommended for You</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>See More</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recommendedCourses}
            renderItem={renderRecommendedCourse}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedContainer}
          />
        </View>

        {/* Upcoming Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleLarge}>Upcoming Sessions</Text>
          {upcomingSessions.map((session) => (
            <BlurView
              key={session.id}
              intensity={15}
              style={styles.sessionCard}
            >
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
                style={styles.sessionIcon}
              >
                <Ionicons name="calendar" size={20} color="white" />
              </LinearGradient>
              <View style={styles.sessionContent}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionTime}>{session.time}</Text>
                <View style={styles.sessionTypeBadge}>
                  <Text style={styles.sessionTypeText}>{session.type}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.sessionNotifyButton}>
                <Ionicons
                  name="notifications"
                  size={16}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>
            </BlurView>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <BlurView intensity={15} style={styles.statCard}>
            <Ionicons name="book" size={24} color="#6366f1" />
            <Text style={styles.statLabel}>Courses</Text>
            <Text style={styles.statValue}>{courses.length}</Text>
          </BlurView>
          <BlurView intensity={15} style={styles.statCard}>
            <Ionicons name="time" size={24} color="#10b981" />
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>{user.hoursThisWeek}h</Text>
          </BlurView>
          <BlurView intensity={15} style={styles.statCard}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.statLabel}>Achievements</Text>
            <Text style={styles.statValue}>
              {achievements.filter((a) => a.unlocked).length}
            </Text>
          </BlurView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  index,
  currentIndex,
  onSwipe,
}) => {
  // Only the essential animated values
  const translateX = useRef(new Animated.Value(0)).current;

  // Add useEffect import
  const { useEffect } = React;

  const isActive = index === currentIndex;
  const isNext = index === currentIndex + 1;
  const isPrev = index === currentIndex - 1;
  const isVisible = isActive || isNext || isPrev;

  // Reset animation values when card becomes active
  useEffect(() => {
    if (isActive) {
      translateX.setValue(0);
    }
  }, [isActive]);

  if (!isVisible) return null;

  // Simple card positioning
  let cardStyle: any = {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignSelf: "center" as const,
    width: cardWidth,
    height: cardHeight,
    zIndex: isActive ? 100 : 10,
    shadowColor: "#6366f1",
    shadowOpacity: isActive ? 0.35 : 0.15,
    shadowRadius: isActive ? 24 : 8,
    elevation: isActive ? 18 : 6,
    backgroundColor: isActive ? "rgba(0,0,0,0.1)" : "rgba(0,0,0, 0.4)",
  };

  // Preview cards positioned relative to active card's movement
  if (isNext) {
    cardStyle.opacity = 0.7;
    cardStyle.transform = [
      { translateX: cardWidth * 0.15 }, // Base offset to the right
      { scale: 0.95 },
    ];
  } else if (isPrev) {
    cardStyle.opacity = 0.7;
    cardStyle.transform = [
      { translateX: -cardWidth * 0.15 }, // Base offset to the left
      { scale: 0.95 },
    ];
  }

  // Minimal animated style - only translateX
  let animatedStyle = {};
  if (isActive) {
    animatedStyle = {
      transform: [{ translateX }],
    };
  }

  // Super simple gesture event - only translateX
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  // Simplified state handling
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;

      const shouldSwipe =
        Math.abs(translationX) > 80 || Math.abs(velocityX) > 500;

      if (shouldSwipe) {
        const direction = translationX > 0 ? "right" : "left";
        const targetX = direction === "right" ? screenWidth : -screenWidth;

        // Single fast animation
        Animated.timing(translateX, {
          toValue: targetX,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          onSwipe(direction);
          translateX.setValue(0);
        });
      } else {
        // Quick snap back
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const CardContent = () => (
    <BlurView intensity={20} style={styles.swipeCard}>
      <Image
        source={{ uri: course.image }}
        style={styles.swipeCourseImage}
        resizeMode="cover"
      />
      <View style={styles.swipeCourseContent}>
        <View>
          <Text style={styles.swipeCourseTitle}>{course.title}</Text>
          <Text style={styles.swipeCourseDescription}>
            {course.description}
          </Text>
        </View>
        <Text style={styles.swipeProgressText}>
          {course.modulesCompleted} of {course.totalModules} modules completed
        </Text>
        <View style={styles.swipeProgressSection}>
          <View style={styles.swipeProgressBar}>
            <LinearGradient
              colors={["#6366f1", "#8b5cf6"]}
              style={[
                styles.swipeProgressFill,
                { width: `${course.completionPercentage}%` },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
        <View style={styles.swipeInstructorSection}>
          <Image
            source={{ uri: course.instructorImage }}
            style={styles.swipeInstructorImage}
            resizeMode="cover"
          />
          <View>
            <Text style={styles.swipeInstructorName}>{course.instructor}</Text>
            <Text style={styles.swipeInstructorTitle}>
              {course.difficulty} Level
            </Text>
          </View>
        </View>
        <View style={styles.swipeStatsRow}>
          <View style={styles.swipeStatItem}>
            <Text style={styles.swipeStatValue}>
              {course.completionPercentage}%
            </Text>
            <Text style={styles.swipeStatLabel}>Complete</Text>
          </View>
          <View style={styles.swipeStatItem}>
            <Text style={styles.swipeStatValue}>{course.totalHours}h</Text>
            <Text style={styles.swipeStatLabel}>Duration</Text>
          </View>
          <View style={styles.swipeStatItem}>
            <Text style={styles.swipeStatValue}>{course.rating}</Text>
            <Text style={styles.swipeStatLabel}>Rating</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8}>
          <LinearGradient
            colors={["#6366f1", "#8b5cf6"]}
            style={styles.swipeActionButton}
          >
            <Text style={styles.swipeActionButtonText}>
              {course.completionPercentage > 0
                ? "Continue Learning"
                : "Start Course"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  if (isActive) {
    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={isActive}
      >
        <Animated.View
          style={[styles.swipeCardContainer, cardStyle, animatedStyle]}
        >
          <CardContent />
        </Animated.View>
      </PanGestureHandler>
    );
  }

  return (
    <Animated.View style={[styles.swipeCardContainer, cardStyle]}>
      <CardContent />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  backgroundElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement: {
    position: "absolute",
    borderRadius: 200,
    opacity: 0.1,
  },
  element1: {
    width: 300,
    height: 300,
    backgroundColor: "#6366f1",
    top: -150,
    right: -150,
  },
  element2: {
    width: 250,
    height: 250,
    backgroundColor: "#ec4899",
    bottom: -125,
    left: -125,
  },
  element3: {
    width: 200,
    height: 200,
    backgroundColor: "#8b5cf6",
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    gap: 12,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 6,
  },
  pointsText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 6,
  },
  streakText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationButton: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: "#ef4444",
    borderRadius: 4,
  },
  heroSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginBottom: 2,
  },
  userName: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 2,
  },
  userLevel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "500",
  },
  overallProgress: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  progressPercentage: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
  },
  filterButton: {
    padding: 4,
  },
  weeklyGoalContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  goalProgress: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "bold",
  },
  goalProgressContainer: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  goalProgressBar: {
    height: "100%",
    borderRadius: 3,
  },
  goalSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  pickupSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  pickupCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pickupCourseTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  pickupModuleTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 12,
  },
  pickupProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pickupProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  pickupProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  pickupTimeLeft: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderSimple: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleLarge: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  viewAllText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "600",
  },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 16,
  },
  courseCardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  courseCardContent: {
    flex: 1,
  },
  courseCardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  courseCardInstructor: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 8,
  },
  courseCardProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  courseCardProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  courseCardProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  courseCardPercentage: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  courseCardLastAccessed: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: (screenWidth - 64) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  achievementUnlocked: {
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  unlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unlockedText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "600",
  },
  achievementProgressContainer: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  achievementProgress: {
    height: "100%",
    borderRadius: 1.5,
  },
  categoriesContainer: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  activeCategoryButton: {
    backgroundColor: "transparent",
    borderColor: "#6366f1",
  },
  categoryText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  activeCategoryText: {
    color: "#6366f1",
    fontWeight: "600",
  },
  recommendedContainer: {
    paddingRight: 20,
  },
  recommendedCard: {
    width: 240,
    marginRight: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  recommendedImage: {
    width: "100%",
    height: 120,
  },
  recommendedContent: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  recommendedTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  recommendedStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  studentsText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  durationText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 16,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sessionTime: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 6,
  },
  sessionTypeBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  sessionTypeText: {
    color: "#a5b4fc",
    fontSize: 10,
    fontWeight: "600",
  },
  sessionNotifyButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 12,
  },
  statsSection: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  bottomNav: {
    flexDirection: "row",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  activeNavTab: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  navIconContainer: {
    marginBottom: 4,
  },
  activeNavIconContainer: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    padding: 6,
    borderRadius: 12,
  },
  navLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "500",
  },
  activeNavLabel: {
    color: "white",
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContainer: {
    position: "absolute",
    width: cardWidth,
    height: cardHeight,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  courseImage: {
    width: "100%",
    height: "45%",
  },
  courseContent: {
    flex: 1,
    padding: 24,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "space-between",
  },
  courseTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    lineHeight: 28,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBarFull: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  instructorSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  instructorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  instructorName: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
  },
  statValueCard: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Discover Section Styles
  discoverSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  cardStack: {
    height: cardHeight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  swipeInstructions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginTop: 20,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swipeHintText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  // Course Card Styles (for swipeable cards)
  swipeCardContainer: {
    position: "absolute",
    width: cardWidth,
    height: cardHeight,
  },
  swipeCard: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
  },
  swipeCourseImage: {
    width: "100%",
    height: "45%",
  },
  swipeCourseContent: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.41)",
  },
  swipeCourseTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    lineHeight: 28,
  },
  swipeCourseDescription: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  swipeProgressSection: {
    marginBottom: 20,
  },
  swipeProgressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  swipeProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  swipeProgressText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  swipeInstructorSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  swipeInstructorImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  swipeInstructorName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  swipeInstructorTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  swipeStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  swipeStatItem: {
    alignItems: "center",
  },
  swipeStatValue: {
    color: "#6366f1",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  swipeStatLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  swipeActionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  swipeActionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeScreen;
