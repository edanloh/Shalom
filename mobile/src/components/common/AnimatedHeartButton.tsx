import React, { useRef } from "react";
import {
  Animated,
  TouchableOpacity,
  type GestureResponderEvent,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  filled: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: Insets;
  accessibilityLabel?: string;
  size?: number;
  color?: string;
  activeOpacity?: number;
};

export default function AnimatedHeartButton({
  filled,
  onPress,
  style,
  hitSlop,
  accessibilityLabel,
  size = 20,
  color = "#fff",
  activeOpacity = 0.7,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = (event: GestureResponderEvent) => {
    scale.stopAnimation();
    scale.setValue(0.88);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.18,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={hitSlop}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={activeOpacity}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={filled ? "heart" : "heart-outline"}
          size={size}
          color={color}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
