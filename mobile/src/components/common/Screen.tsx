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
import ToastHost from "./Toast";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  navigation?: any;
  headerLeftIcon?: string;
  headerLeftComponent?: React.ReactNode;
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
  scrollEnabled?: boolean;
  stickyHeader?: boolean;
}

export default function Screen({
  title,
  subtitle,
  children,
  navigation,
  headerLeftIcon,
  headerLeftComponent,
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
  scrollEnabled = true,
  stickyHeader = false,
}: ScreenProps) {
  const header = (
    <View style={{ backgroundColor: Colors.primary }}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        headerLeftIcon={headerLeftIcon}
        headerLeftComponent={headerLeftComponent}
        headerRightIcon={headerRightIcon}
        headerRightComponent={headerRightComponent}
        onHeaderLeftPress={onHeaderLeftPress || (() => navigation?.goBack())}
        onHeaderRightPress={onHeaderRightPress}
      />
    </View>
  );

  const headerElement = !noHeader ? header : null;

  return (
    <SafeAreaView
      style={styles.container}
      edges={customEdges || ["top", "left", "right", "bottom"]}
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
          stickyHeaderIndices={!noHeader && stickyHeader ? [0] : undefined}
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
          alwaysBounceVertical={true}
          overScrollMode="always"
          scrollEnabled={scrollEnabled}
        >
          {headerElement}
          <View style={widescreen ? styles.fullScrollContent : styles.scrollContent}>{children}</View>
        </ScrollView>
        <ToastHost />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
