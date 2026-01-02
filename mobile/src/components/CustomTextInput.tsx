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
import { Colors, Spacing } from "@/constants";

interface CustomTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  style?: any;
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: "auto" | "top" | "bottom";
  inputContainerStyle?: any;
  leftIconName?: keyof typeof Ionicons.glyphMap;
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
  multiline = false,
  numberOfLines,
  textAlignVertical,
  inputContainerStyle,
  leftIconName,
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
        {leftIconName && (
          <Ionicons
            name={leftIconName}
            size={20}
            color="white"
            style={[
              styles.inputIcon,
              multiline && { alignSelf: "flex-start", paddingTop: Spacing.lg },
            ]}
          />
        )}
        <TextInput
          style={[styles.input, style, { outlineStyle: "none" }]}
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
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={textAlignVertical}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText("")}
            style={[
              styles.eyeIcon,
              { paddingRight: onTogglePassword ? 0 : Spacing.md },
              multiline && { alignSelf: "flex-start", paddingTop: Spacing.lg },
            ]}
          >
            <Ionicons name={"close-circle-outline"} size={20} color="white" />
          </TouchableOpacity>
        )}
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
        <View style={{ marginBottom: 8 }}>
          <Text
            style={[
              styles.warningText,
              { color: warningTextColor || Colors.textWarning },
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
