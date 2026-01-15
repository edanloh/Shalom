// src/screens/EditProfileScreen.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, TextStyles } from "../constants";
import { useAuth } from "../contexts/AuthContext";
import Screen from "../components/common/Screen";
import { ActionButton, CustomTextInput } from "@/components";
import { fetchUserProfile, updateUserProfile } from "@/services/userService";

export default function EditProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const { user: authUser } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    location: user?.location || "",
    phone: user?.phone || "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch user profile on mount
    const fetchProfile = async () => {
      try {
        const data = await fetchUserProfile(authUser!.email);
        setUser(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          bio: data.bio || "",
          location: data.location || "",
          phone: data.phone || "",
        });
        setPageLoading(false);
      } catch (error) {
        Alert.alert("Error", "Failed to load user profile");
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert("Error", "Name and email are required");
      return;
    }
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800)); // simulate API
      await updateUserProfile(user.id, formData);
      Alert.alert("Success", "Profile updated", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeAvatar = () => {
    Alert.alert("Change Avatar", "Choose an option", [
      { text: "Take Photo", onPress: () => {} },
      { text: "Choose from Gallery", onPress: () => {} },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Screen
      title="Edit Profile"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      headerRightComponent={
        <ActionButton
          onPress={handleSave}
          disabled={isLoading || pageLoading}
          loading={isLoading}
          text={isLoading ? "Saving..." : "Save"}
          style={{ marginBottom: 0, height: 42, padding: 12, paddingTop: 9 }}
        />
      }
      onHeaderLeftPress={() => navigation.goBack()}
      customEdges={["top", "bottom"]}
      stickyHeader
    >
      {pageLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <View style={{ height: Spacing.md }} />
          <Text style={TextStyles.caption}>Fetching profile...</Text>
        </View>
      ) : (
        <>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View>
              <Image
                source={
                  user?.avatar
                    ? { uri: user.avatar }
                    : require("@assets/profile.png")
                }
                style={styles.avatar}
              />
              <Pressable
                style={styles.avatarEditButton}
                onPress={handleChangeAvatar}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </Pressable>
            </View>
            <Text
              style={[
                TextStyles.caption,
                { textAlign: "center", marginTop: Spacing.md },
              ]}
            >
              Tap to change photo
            </Text>
          </View>

          {/* Form */}
          <View>
            {/* Name */}
            <Text style={TextStyles.h5}>Full Name *</Text>
            <CustomTextInput
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              autoCapitalize={"none"}
              keyboardType={"default"}
              leftIconName="person-outline"
            />

            {/* Email */}
            {/* <Text style={TextStyles.h5}>Email Address *</Text>
            <CustomTextInput
              placeholder="Enter your email address"
              value={formData.email}
              onChangeText={(t) => setFormData({ ...formData, email: t })}
              autoCapitalize={'none'}
              keyboardType="email-address"
              leftIconName="mail-outline"
            /> */}

            {/* Bio */}
            <Text style={TextStyles.h5}>Bio</Text>
            <CustomTextInput
              placeholder="Tell us about yourself"
              value={formData.bio}
              onChangeText={(t) => setFormData({ ...formData, bio: t })}
              autoCapitalize={"none"}
              leftIconName="document-text-outline"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />

            {/* Location */}
            <Text style={TextStyles.h5}>Location *</Text>
            <CustomTextInput
              placeholder="Enter your location"
              value={formData.location}
              onChangeText={(t) => setFormData({ ...formData, location: t })}
              autoCapitalize={"none"}
              leftIconName="location-outline"
            />

            {/* Phone */}
            <Text style={TextStyles.h5}>Phone Number</Text>
            <CustomTextInput
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(t) => setFormData({ ...formData, phone: t })}
              keyboardType="phone-pad"
              leftIconName="call-outline"
            />
          </View>
          <Text
            style={[
              TextStyles.caption,
              { textAlign: "center", marginTop: Spacing.md },
            ]}
          >
            Version 1.0.0
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#E5E7EB",
  },
  avatarEditButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.purple400,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  loadingState: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
});
