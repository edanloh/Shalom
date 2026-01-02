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
  headerRightComponent?: React.ReactNode;
  onHeaderLeftPress?: () => void;
  onHeaderRightPress?: () => void;
  customScreenStyle?: object;
  customEdges?: Array<"top" | "bottom" | "left" | "right">;
  refreshing?: boolean;
  onRefresh?: () => void;
  noHeader?: boolean;
  widescreen?: boolean;
}

export default function Screen({
  title,
  subtitle,
  children,
  navigation,
  headerLeftIcon,
  headerRightIcon,
  headerRightComponent,
  onHeaderLeftPress,
  onHeaderRightPress,
  customScreenStyle,
  customEdges,
  refreshing,
  onRefresh,
  noHeader,
  widescreen,
}: ScreenProps) {
  const header = (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      headerLeftIcon={headerLeftIcon}
      headerRightIcon={headerRightIcon}
      headerRightComponent={headerRightComponent}
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
          {!noHeader && header}
          <View style={widescreen ? styles.fullScrollContent : styles.scrollContent}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
