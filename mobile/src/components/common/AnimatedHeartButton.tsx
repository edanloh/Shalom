import React from "react";
import {
  TouchableOpacity,
  type GestureResponderEvent,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (event: GestureResponderEvent) => {
    scale.value = 0.7;
    scale.value = withSpring(1, { damping: 5, stiffness: 800 });
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
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={filled ? "heart" : "heart-outline"}
          size={size}
          color={color}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
