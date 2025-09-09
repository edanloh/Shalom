import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { warn } from "console";

interface CustomTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  style?: any;
  inputContainerStyle?: any;
  eyeIconStyle?: any;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
  warningText?: string;
  warningTextColor?: string;
}

const CustomTextInput: React.FC<CustomTextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  showPassword,
  onTogglePassword,
  style,
  inputContainerStyle,
  eyeIconStyle,
  autoCapitalize = "none",
  keyboardType,
  warningText,
  warningTextColor,
}) => {
  const inputMarginBottom = warningText ? 8 : 16;
  return (
    <View>
      <View
        style={[
          styles.inputContainer,
          inputContainerStyle,
          { marginBottom: inputMarginBottom },
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={
            secureTextEntry && showPassword !== undefined
              ? !showPassword
              : secureTextEntry
          }
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          placeholderTextColor="#aaaaab"
        />
        {onTogglePassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={[styles.eyeIcon, eyeIconStyle]}
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color="#ffffffff"
            />
          </TouchableOpacity>
        )}
      </View>
      {warningText ? (
        <View style={{ marginBottom: 8, marginHorizontal: 8 }}>
          <Text
            style={[
              styles.warningText,
              { color: warningTextColor || "#ff6b6b" },
            ]}
          >
            {warningText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#3e3e47",
  },
  inputIcon: { marginLeft: 16 },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#ffffff",
    fontFamily: "Lexend-Light",
    borderRadius: 12,
  },
  eyeIcon: { padding: 16 },
  warningText: {
    fontSize: 12,
    fontFamily: "Lexend-Light",
  },
});

export default CustomTextInput;
