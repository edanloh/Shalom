import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "@/styles/styles";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  headerLeftIcon?: string;
  headerRightIcon?: string;
  headerRightComponent?: React.ReactNode;
  onHeaderLeftPress?: () => void;
  onHeaderRightPress?: () => void;
}

export default function ScreenHeader({
  title,
  subtitle,
  headerLeftIcon,
  headerRightIcon,
  headerRightComponent,
  onHeaderLeftPress,
  onHeaderRightPress,
}: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      {headerLeftIcon ? (
        <TouchableOpacity
          onPress={onHeaderLeftPress}
          style={[styles.backButton, { width: 28 }]}
        >
          <Ionicons
            name={(headerLeftIcon as any) || "chevron-back"}
            size={28}
            color="white"
          />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 28 }} />
      )}

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
        pointerEvents="box-none"
      >
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {headerRightComponent ? (
        headerRightComponent
      ) : headerRightIcon && onHeaderRightPress ? (
        <TouchableOpacity onPress={onHeaderRightPress}>
          <Ionicons name={headerRightIcon as any} size={28} color="white" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 28 }} />
      )}
    </View>
  );
}
