import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants";
import styles from "@/styles/styles";

interface ScreenProps {
  title: string;
  children: React.ReactNode;
  navigation: any;
  showBackButton?: boolean;
  showSettingsButton?: boolean;
  onSettingsPress?: () => void;
  headerRightIcon?: string;
  onHeaderRightPress?: () => void;
}

export default function Screen({
  title,
  children,
  navigation,
  showBackButton = true,
  showSettingsButton = false,
  onSettingsPress,
  headerRightIcon,
  onHeaderRightPress,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.slimScrollContent}>
          {/* Header */}
          <View style={styles.screenHeader}>
            {showBackButton ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backButton, { width: 28 }]}
              >
                <Ionicons name="chevron-back" size={28} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}

            <Text style={styles.headerTitle}>{title}</Text>

            {showSettingsButton && onSettingsPress ? (
              <TouchableOpacity onPress={onSettingsPress}>
                <Ionicons name="cog" size={28} color="white" />
              </TouchableOpacity>
            ) : headerRightIcon && onHeaderRightPress ? (
              <TouchableOpacity onPress={onHeaderRightPress}>
                <Ionicons
                  name={headerRightIcon as any}
                  size={28}
                  color="white"
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 28 }} />
            )}
          </View>

          {/* Content */}
          <View style={styles.form}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
