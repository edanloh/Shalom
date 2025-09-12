import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "@/styles/styles";
import colors from "@/styles/colors";

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
  onSubmitEditing?: () => void;
  returnKeyType?:
    | "default"
    | "go"
    | "google"
    | "join"
    | "next"
    | "route"
    | "search"
    | "send"
    | "yahoo"
    | "done"
    | "emergency-call";
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
  onSubmitEditing,
  returnKeyType = "default",
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
          placeholderTextColor={colors.infoText}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
        {onTogglePassword && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={[styles.eyeIcon, eyeIconStyle]}
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color="white"
            />
          </TouchableOpacity>
        )}
      </View>
      {warningText ? (
        <View style={{ marginBottom: 8, marginHorizontal: 8 }}>
          <Text
            style={[
              styles.warningText,
              { color: warningTextColor || colors.warningText },
            ]}
          >
            {warningText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export default CustomTextInput;
