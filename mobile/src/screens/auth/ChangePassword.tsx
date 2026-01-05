import { useState } from "react";
import { View, Text, Alert } from "react-native";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";
import { Colors, Spacing, TextStyles } from "@/constants";
import Screen from "@/components/common/Screen";

export default function ChangePasswordScreen({ navigation }: any) {
  const { changePassword } = useAuth();
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [warnings, setWarnings] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    const rules = [
      { test: pwd.length >= 8, msg: "Password must be at least 8 characters" },
      {
        test: /[0-9]/.test(pwd),
        msg: "Password must contain at least 1 number",
      },
      {
        test: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
        msg: "Password must contain at least 1 special character",
      },
      {
        test: /[A-Z]/.test(pwd),
        msg: "Password must contain at least 1 uppercase letter",
      },
      {
        test: /[a-z]/.test(pwd),
        msg: "Password must contain at least 1 lowercase letter",
      },
    ];
    return rules.find((r) => !r.test)?.msg || "";
  };

  const handleChangePassword = async () => {
    setWarnings({ current: "", new: "", confirm: "" });

    if (!passwords.current)
      return setWarnings((w) => ({
        ...w,
        current: "Please enter your current password",
      }));
    if (!passwords.new)
      return setWarnings((w) => ({ ...w, new: "Please enter a new password" }));

    const validation = validatePassword(passwords.new);
    if (validation) return setWarnings((w) => ({ ...w, new: validation }));

    if (!passwords.confirm)
      return setWarnings((w) => ({
        ...w,
        confirm: "Please confirm your new password",
      }));
    if (passwords.new !== passwords.confirm)
      return setWarnings((w) => ({ ...w, confirm: "Passwords do not match" }));
    if (passwords.current === passwords.new)
      return setWarnings((w) => ({
        ...w,
        new: "New password must be different from current password",
      }));

    setLoading(true);
    const result = await changePassword(passwords.current, passwords.new);
    setLoading(false);

    if (result.success) {
      Alert.alert("Success", "Your password has been changed successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else {
      setWarnings((w) => ({
        ...w,
        current: result.error || "Failed to change password",
      }));
    }
  };

  return (
    <Screen
      title="Change Password"
      navigation={navigation}
      headerLeftIcon="chevron-back"
      onHeaderLeftPress={() => navigation.goBack()}
      customEdges={["top", "bottom"]}
    >
      <View style={{ paddingVertical: Spacing.base }}>
        <Text
          style={[
            TextStyles.body,
            { color: Colors.textSecondary, marginBottom: Spacing.lg },
          ]}
        >
          Enter your current password and choose a new secure password.
        </Text>

        <CustomTextInput
          value={passwords.current}
          onChangeText={(text) => {
            setPasswords((p) => ({ ...p, current: text }));
            setWarnings((w) => ({ ...w, current: "" }));
          }}
          placeholder="Current Password"
          secureTextEntry
          showPassword={showPasswords.current}
          onTogglePassword={() =>
            setShowPasswords((s) => ({ ...s, current: !s.current }))
          }
          warningText={warnings.current}
          returnKeyType="next"
        />

        <CustomTextInput
          value={passwords.new}
          onChangeText={(text) => {
            setPasswords((p) => ({ ...p, new: text }));
            setWarnings((w) => ({
              ...w,
              new: text ? validatePassword(text) : "",
            }));
          }}
          placeholder="New Password"
          secureTextEntry
          showPassword={showPasswords.new}
          onTogglePassword={() =>
            setShowPasswords((s) => ({ ...s, new: !s.new }))
          }
          warningText={passwords.new ? warnings.new : ""}
          returnKeyType="next"
        />

        <CustomTextInput
          value={passwords.confirm}
          onChangeText={(text) => {
            setPasswords((p) => ({ ...p, confirm: text }));
            setWarnings((w) => ({
              ...w,
              confirm:
                text && passwords.new && text !== passwords.new
                  ? "Passwords do not match"
                  : "",
            }));
          }}
          placeholder="Confirm New Password"
          secureTextEntry
          showPassword={showPasswords.confirm}
          onTogglePassword={() =>
            setShowPasswords((s) => ({ ...s, confirm: !s.confirm }))
          }
          warningText={warnings.confirm}
          returnKeyType="go"
          onSubmitEditing={handleChangePassword}
        />

        <View style={{ marginBottom: Spacing.lg }}>
          <Text
            style={[
              TextStyles.caption,
              { color: Colors.textSecondary, marginBottom: 8 },
            ]}
          >
            Password must contain:
          </Text>
          {[
            "At least 8 characters",
            "At least 1 uppercase letter",
            "At least 1 lowercase letter",
            "At least 1 number",
            "At least 1 special character",
          ].map((req) => (
            <Text
              key={req}
              style={[TextStyles.caption, { color: Colors.textSecondary }]}
            >
              • {req}
            </Text>
          ))}
        </View>

        <ActionButton
          onPress={handleChangePassword}
          disabled={loading}
          loading={loading}
          text={loading ? "Changing Password..." : "Change Password"}
        />
      </View>
    </Screen>
  );
}
