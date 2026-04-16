import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "@/styles/styles";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  headerLeftIcon?: string;
  headerLeftComponent?: React.ReactNode;
  headerRightIcon?: string;
  headerRightComponent?: React.ReactNode;
  onHeaderLeftPress?: () => void;
  onHeaderRightPress?: () => void;
  customStyles?: object;
}

export default function ScreenHeader({
  title,
  subtitle,
  headerLeftIcon,
  headerLeftComponent,
  headerRightIcon,
  headerRightComponent,
  onHeaderLeftPress,
  onHeaderRightPress,
  customStyles,
}: ScreenHeaderProps) {
  return (
    <View style={customStyles ? [styles.screenHeader, customStyles] : styles.screenHeader}>
      {headerLeftComponent ? (
        headerLeftComponent
      ) : ( headerLeftIcon ) ? (
        <TouchableOpacity
          onPress={onHeaderLeftPress}
          style={[styles.backButton, { width: 44, height: 44 }]}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
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
          left: 50,
          right: 50,
          alignItems: "center",
          justifyContent: "center",
        }}
        pointerEvents="box-none"
      >
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        )}
      </View>

      {headerRightComponent ? (
        headerRightComponent
      ) : headerRightIcon && onHeaderRightPress ? (
        <TouchableOpacity
          onPress={onHeaderRightPress}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
        >
          <Ionicons name={headerRightIcon as any} size={28} color="white" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 28 }} />
      )}
    </View>
  );
}
