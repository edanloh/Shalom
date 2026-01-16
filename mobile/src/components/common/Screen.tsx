import React, { useRef } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  RefreshControl,
  DeviceEventEmitter,
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
  stickyHeaderIndices?: number[];
  disableChildrenWrapper?: boolean;
  useScrollView?: boolean;
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
  stickyHeaderIndices,
  disableChildrenWrapper = false,
  useScrollView = true,
}: ScreenProps) {
  const lastScrollY = useRef(0);
  const tabHidden = useRef(false);

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

  const resolvedStickyHeaders =
    typeof stickyHeaderIndices !== "undefined"
      ? stickyHeaderIndices
      : !noHeader && stickyHeader
      ? [0]
      : undefined;

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
        {useScrollView ? (
          <ScrollView
            contentContainerStyle={[styles.fullScrollContent, customScreenStyle]}
            nestedScrollEnabled={true}
            stickyHeaderIndices={resolvedStickyHeaders}
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
            scrollEventThrottle={16}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              const dy = y - lastScrollY.current;
              if (Math.abs(dy) < 8) return;

              if (dy > 0 && y > 40 && !tabHidden.current) {
                tabHidden.current = true;
                DeviceEventEmitter.emit("tabbar:toggle", { visible: false });
              } else if (dy < 0 && tabHidden.current) {
                tabHidden.current = false;
                DeviceEventEmitter.emit("tabbar:toggle", { visible: true });
              }

              lastScrollY.current = y;
            }}
          >
            {headerElement}
            {disableChildrenWrapper ? (
              children
            ) : (
              <View style={widescreen ? styles.fullScrollContent : styles.scrollContent}>
                {children}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {headerElement}
            {disableChildrenWrapper ? (
              children
            ) : (
              <View style={widescreen ? styles.fullScrollContent : styles.scrollContent}>
                {children}
              </View>
            )}
          </View>
        )}
        <ToastHost />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
