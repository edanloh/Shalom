import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "@/styles/styles";
import colors from "@/styles/colors";
import { Ionicons } from "@expo/vector-icons";
import CustomTextInput from "@/components/CustomTextInput";
import { API_BASE_URL } from "react-native-dotenv";
import { Colors, TextStyles } from "@/constants";

export default function UserManagementScreen({ navigation }: any) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/dev/getAllUserInfo`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user info from API Gateway");
        }
        const result = await response.json();
        setUsers(result.users || []);
      } catch (err: any) {
        setError(err.message || "Error fetching users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter users by search
  const filteredInstructors = users.filter(
    (u) =>
      u.role === "instructor" &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredStudents = users.filter(
    (u) =>
      u.role === "learner" &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.slimScrollContent}>
          {/* Header */}
          <View style={styles.screenHeader}>
            <TouchableOpacity />
            <Text style={styles.headerTitle}>User Management</Text>
            <TouchableOpacity />
          </View>
          {/* Form */}
          <View style={styles.form}>
            <CustomTextInput
              placeholder={"Search by name or email"}
              value={search}
              onChangeText={setSearch}
              autoCapitalize={"none"}
              keyboardType={"default"}
            />
            {/* Search Users */}

            {/* Instructors List */}
            <View>
              <Text style={TextStyles.h3}>
                Instructors{" "}
                {filteredInstructors.length > 0 &&
                  `(${filteredInstructors.length})`}
              </Text>
              {loading ? (
                <Text style={styles.infoText}>Loading users...</Text>
              ) : error ? (
                <Text style={[styles.infoText, { color: colors.warningText }]}>
                  {error}
                </Text>
              ) : filteredInstructors.length === 0 ? (
                <Text style={styles.infoText}>No instructors found.</Text>
              ) : (
                filteredInstructors.map((user) => (
                  <View
                    key={user.username}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Image
                      source={require("@assets/profile.png")}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        marginRight: 12,
                        borderColor: colors.loginLink,
                        borderWidth: 2,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "flex-start",
                        }}
                      >
                        <Text style={{ color: "white" }}>
                          Name: {user.name}
                        </Text>
                        {user?.authProvider &&
                          user?.authProvider == "Google" && (
                            <Image
                              source={require("@assets/google.png")}
                              style={{
                                width: 14,
                                height: 14,
                                resizeMode: "contain",
                                marginLeft: 8,
                                marginTop: 2,
                              }}
                            />
                          )}
                      </View>
                      <Text style={styles.loginText}>Email: {user.email}</Text>
                    </View>
                    <TouchableOpacity>
                      <Ionicons
                        name="create-outline"
                        size={28}
                        color={"white"}
                        onPress={() => {
                          navigation.navigate("UserConfig", { user });
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              {/* Students List */}
              <Text style={TextStyles.h3}>
                Students{" "}
                {filteredStudents.length > 0 && `(${filteredStudents.length})`}
              </Text>
              {loading ? (
                <Text style={styles.infoText}>Loading users...</Text>
              ) : error ? (
                <Text style={[styles.infoText, { color: colors.warningText }]}>
                  {error}
                </Text>
              ) : filteredStudents.length === 0 ? (
                <Text style={styles.infoText}>No students found.</Text>
              ) : (
                filteredStudents.map((user) => (
                  <View
                    key={user.username}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      backgroundColor: colors.background,
                    }}
                  >
                    <Image
                      source={require("@assets/profile.png")}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        marginRight: 12,
                      }}
                    />
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "flex-start",
                        }}
                      >
                        <Text style={{ color: "white" }}>
                          Name: {user.name}
                        </Text>
                        {user?.authProvider &&
                          user?.authProvider == "Google" && (
                            <Image
                              source={require("@assets/google.png")}
                              style={{
                                width: 14,
                                height: 14,
                                resizeMode: "contain",
                                marginLeft: 8,
                                marginTop: 2,
                              }}
                            />
                          )}
                      </View>
                      <Text style={styles.loginText}>Email: {user.email}</Text>
                    </View>
                    <TouchableOpacity>
                      <Ionicons
                        name="create-outline"
                        size={28}
                        color={"white"}
                        onPress={() => {
                          navigation.navigate("UserConfig", { user });
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
