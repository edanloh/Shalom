import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";

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

const ActionButton: React.FC<ActionButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  text,
  imageSource,
  imageStyle,
  style,
  textStyle,
  variant = "primary",
}) => {
  const buttonStyle = [
    variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary,
    style,
  ];
  const textStyleCombined = [
    variant === "primary"
      ? styles.buttonTextPrimary
      : styles.buttonTextSecondary,
    textStyle,
  ];
  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={disabled}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#564beb"} />
      ) : imageSource ? (
        <Image
          source={imageSource}
          style={imageStyle ? imageStyle : styles.image}
        />
      ) : (
        <Text style={textStyleCombined}>{text}</Text>
      )}
    </TouchableOpacity>
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Lexend-Light",
  },
  buttonTextSecondary: {
    color: "#564beb",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Lexend-Light",
  },
  image: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
});

export default ActionButton;
