import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors, TextStyles } from "../constants";

interface ActionButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  imageSource?: any;
  imageStyle?: any;
  style?: any;
  textStyle?: any;
  variant?: "primary" | "secondary";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActionButton({
  onPress,
  disabled = false,
  loading = false,
  text,
  imageSource,
  imageStyle,
  style,
  textStyle,
  variant = "primary",
}: ActionButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 400 });
    if (variant === "primary") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 400 });
  };

  const buttonStyle = [
    variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary,
    disabled && styles.disabled,
    style,
  ];
  const textStyleCombined = [
    variant === "primary"
      ? styles.buttonTextPrimary
      : styles.buttonTextSecondary,
    textStyle,
  ];

  return (
    <AnimatedPressable
      testID="action-button"
      style={[buttonStyle, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator
          testID="activity-indicator"
          color={variant === "primary" ? "#fff" : "#564beb"}
        />
      ) : imageSource ? (
        <Image
          testID="button-image"
          source={imageSource}
          style={imageStyle ? imageStyle : styles.image}
        />
      ) : (
        <Text style={textStyleCombined}>{text}</Text>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  buttonPrimary: {
    backgroundColor: "#564beb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonSecondary: {
    backgroundColor: "#3e3e47",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonTextPrimary: {
    ...TextStyles.bodyMedium,
    color: Colors.white,
  },
  buttonTextSecondary: {
    ...TextStyles.bodyMedium,
    color: Colors.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
  image: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
});