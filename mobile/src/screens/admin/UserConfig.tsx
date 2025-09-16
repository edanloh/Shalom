import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "@/styles/styles";
import colors from "@/styles/colors";
import { API_BASE_URL } from "react-native-dotenv";
import { Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export default function UserConfigScreen({ navigation, route }: any) {
  const { user } = route.params || {};

  // Safety check - if no user data, show error or go back
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.form}>
          <Text
            style={[styles.infoText, { textAlign: "center", marginTop: 50 }]}
          >
            No user data found. Please go back and try again.
          </Text>
        </View>
      </View>
    );
  }

  const [isInstructor, setIsInstructor] = useState(user.role === "instructor");
  const toggleInstructor = () =>
    setIsInstructor((previousState) => !previousState);
  const [isActivated, setIsActivated] = useState(false);
  const toggleActivated = () =>
    setIsActivated((previousState) => !previousState);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.slimScrollContent}>
          {/* Header */}
          <View style={styles.screenHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Configure User</Text>
            <TouchableOpacity>
              <Ionicons
                name="cog"
                size={28}
                color={"white"}
                onPress={() => {
                  navigation.navigate("UserConfig", { user });
                }}
              />
            </TouchableOpacity>
          </View>
          {/* Form */}
          <View style={styles.form}>
            <View style={[styles.header, { marginBottom: 16 }]}>
              <View style={[styles.logo, { marginBottom: 16 }]}>
                <Image
                  source={require("@assets/profile.png")}
                  style={{ width: 100, height: 100, resizeMode: "contain" }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.title}>{user?.name || "Unknown User"}</Text>
                {user?.authProvider && user?.authProvider == "Google" && (
                  <Image
                    source={require("@assets/google.png")}
                    style={{
                      width: 24,
                      height: 24,
                      resizeMode: "contain",
                      marginLeft: 12,
                      marginBottom: 8,
                    }}
                  />
                )}
              </View>
              <Text style={styles.infoText}>
                {user?.email || "Unknown Email"}
              </Text>
            </View>
            <View>
              <Text
                style={{
                  fontFamily: "Lexend-Regular",
                  fontSize: 20,
                  color: "white",
                  marginBottom: 8,
                  marginTop: 8,
                }}
              >
                Account Settings
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  backgroundColor: colors.background,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 16 }}>
                    Instructor
                  </Text>
                </View>
                <Switch
                  onValueChange={toggleInstructor}
                  value={isInstructor}
                  trackColor={{
                    false: colors.buttonSecondary,
                    true: colors.loginLink,
                  }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.buttonSecondary}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  backgroundColor: colors.background,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 16 }}>
                    Account Activated
                  </Text>
                </View>
                <Switch
                  onValueChange={toggleActivated}
                  value={isActivated}
                  trackColor={{
                    false: colors.buttonSecondary,
                    true: colors.loginLink,
                  }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.buttonSecondary}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
