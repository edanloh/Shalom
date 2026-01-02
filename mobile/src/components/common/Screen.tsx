import React from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants";
import styles from "@/styles/styles";
import ScreenHeader from "./ScreenHeader";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  navigation?: any;
  headerLeftIcon?: string;
  headerRightIcon?: string;
  onHeaderLeftPress?: () => void;
  onHeaderRightPress?: () => void;
  customScreenStyle?: object;
  customEdges?: Array<"top" | "bottom" | "left" | "right">;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function Screen({
  title,
  subtitle,
  children,
  navigation,
  headerLeftIcon,
  headerRightIcon,
  onHeaderLeftPress,
  onHeaderRightPress,
  customScreenStyle,
  customEdges,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const header = (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      headerLeftIcon={headerLeftIcon}
      headerRightIcon={headerRightIcon}
      onHeaderLeftPress={onHeaderLeftPress || (() => navigation?.goBack())}
      onHeaderRightPress={onHeaderRightPress}
    />
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={customEdges || ["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Content */}
        <ScrollView
          contentContainerStyle={[styles.fullScrollContent, customScreenStyle]}
          nestedScrollEnabled={true}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing || false}
                onRefresh={onRefresh}
                tintColor={Colors.secondary}
                colors={[Colors.secondary]}
                
              />
            ) : undefined
          }
          alwaysBounceVertical={true} // iOS
          overScrollMode="always" // Android
        >
          {/* Header */}
          {header}
          <View style={styles.scrollContent}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
