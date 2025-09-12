import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useUser } from "../contexts/UserContext";

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { enrolledCourses, completedCourses, progress } = useUser();

  const stats = [
    {
      icon: "library-outline",
      label: "Enrolled Courses",
      value: enrolledCourses.length,
      color: "#8B5CF6",
    },
    {
      icon: "checkmark-circle-outline",
      label: "Completed",
      value: completedCourses.length,
      color: "#10b981",
    },
    {
      icon: "trending-up-outline",
      label: "Avg Progress",
      value: `${Math.round(
        progress.reduce((acc, p) => acc + p.progress, 0) / progress.length || 0
      )}%`,
      color: "#f59e0b",
    },
    {
      icon: "time-outline",
      label: "Learning Hours",
      value: "24h",
      color: "#ef4444",
    },
  ];

  const menuItems = [
    {
      icon: "person-outline",
      title: "Edit Profile",
      onPress: () => navigation.navigate("EditProfile"),
    },
    {
      icon: "settings-outline",
      title: "Settings",
      onPress: () => navigation.navigate("Settings"),
    },
  ];

  if (user?.role === "instructor") {
    menuItems.unshift(
      {
        icon: "add-circle-outline",
        title: "Create Course",
        onPress: () => navigation.navigate("CreateCourse"),
      },
      {
        icon: "library-outline",
        title: "Manage Courses",
        onPress: () => navigation.navigate("ManageCourses"),
      }
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <Image
            source={
              user?.avatar
                ? { uri: user.avatar }
                : require("@assets/profile.png")
            }
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleContainer}>
              <Text
                style={[
                  styles.role,
                  {
                    backgroundColor:
                      user?.role === "instructor" ? "#8B5CF6" : "#10b981",
                  },
                ]}
              >
                {user?.role}
              </Text>
              {user?.authProvider === "google" && (
                <View
                  style={{
                    padding: 4,
                    borderRadius: 12,
                    marginLeft: 8,
                    borderWidth: 1,
                    borderColor: "#bbb",
                  }}
                >
                  <Image
                    source={require("@assets/google.png")}
                    style={[
                      {
                        width: 16,
                        height: 16,
                        resizeMode: "contain",
                        backgroundColor: "white",
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons name="pencil-outline" size={16} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View
              style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}
            >
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Achievement Badge */}
      <View style={styles.achievementCard}>
        <View style={styles.achievementContent}>
          <Ionicons name="trophy-outline" size={32} color="#fbbf24" />
          <View style={styles.achievementText}>
            <Text style={styles.achievementTitle}>Learning Streak</Text>
            <Text style={styles.achievementDescription}>
              7 days in a row! Keep it up!
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color="#9ca3af" />
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <Ionicons name={item.icon as any} size={20} color="#6b7280" />
              <Text style={styles.menuTitle}>{item.title}</Text>
            </View>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color="#9ca3af"
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  userInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: "bold", color: "#1f2937", marginBottom: 4 },
  email: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  roleContainer: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  role: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: "capitalize",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8B5CF6" + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: { flexDirection: "row", padding: 20, paddingTop: 0 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: "#6b7280", textAlign: "center" },
  achievementCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  achievementText: { marginLeft: 16 },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  achievementDescription: { fontSize: 14, color: "#6b7280" },
  menuContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuTitle: { fontSize: 16, color: "#1f2937", marginLeft: 16 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "600",
    marginLeft: 8,
  },
  version: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
  },
});
