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
import { fetchUserProfile, updateUserProfile, uploadProfilePic } from "@/services/userService";
import * as ImagePicker from 'expo-image-picker';

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
        if (!data.avatar) {
          data.avatar = `https://cmtfxsntlfoxgcznanpe.supabase.co/storage/v1/object/public/profilepics/${data.email}_avatar.png`;
        }
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

  function base64ToFile(base64: string, filename: string, mimeType: string) {
    // Remove data URL prefix if present
    const cleaned = base64.replace(/^data:[^;]+;base64,/, "");
    const byteString = atob(cleaned);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    return new File([byteArray], filename, { type: mimeType });
  }

  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      console.log(result.assets[0].uri);
    } else {
      Alert.alert("You did not select any image.");
    }
  }
  
  const handleChangeAvatar = () => {
    pickImageAsync();
    // const base64Image = "data:image/png;base64,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";
    // const testImageFile = base64ToFile(base64Image, `${user.email}_avatar.png`, "image/png");
    // Alert.alert("Change Avatar", "Choose an option", [
    //   { text: "Take Photo", onPress: () => {} },
    //   { text: "Choose from Gallery", onPress: () => {} },
    //   { text: "Cancel", style: "cancel" },
    // ]);
    // uploadProfilePic(user.id, testImageFile).then(() => {
    //   Alert.alert("Success", "Profile picture updated");
    // }).catch(() => {
    //   console.error("Failed to upload avatar");
    //   Alert.alert("Error", "Failed to update profile picture");
    // });
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
              <Image
                source={
                  selectedImage ? { uri: selectedImage } : { uri: user.avatar }
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
