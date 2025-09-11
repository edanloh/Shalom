import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import styles from "@/styles/styles";
import colors from "@/styles/colors";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1); // 1: request, 2: confirm
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [warningText, setWarningText] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordWarning, setPasswordWarning] = useState("");
  const { resetPassword, confirmPasswordReset } = useAuth();

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least 1 number";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return "Password must contain at least 1 special character";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least 1 uppercase letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least 1 lowercase letter";
    }
    return "";
  };

  const handleRequestReset = async () => {
    if (!email) {
      setWarningText("Please enter your email address");
      return;
    }
    setLoading(true);
    const ok = await resetPassword(email);
    setLoading(false);
    if (ok) {
      setStep(2);
      setWarningText("");
    } else {
      setWarningText("Failed to send reset email");
    }
  };

  const handleConfirmReset = async () => {
    if (!code || !newPassword) {
      setWarningText("Please enter the code and new password");
      return;
    }
    setLoading(true);
    const ok = await confirmPasswordReset(email, code, newPassword);
    setLoading(false);
    if (ok) {
      setSuccess(true);
      setWarningText("");
    } else {
      setWarningText("Invalid code or password. Please try again");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              source={require("@assets/shalom.png")}
              style={{ width: 100, height: 100, resizeMode: "contain" }}
            />
          </View>
          <Text style={styles.title}>Shalom</Text>
        </View>
        <View style={styles.form}>
          <Text
            style={{
              fontFamily: "Lexend-Regular",
              fontSize: 22,
              color: "white",
              marginBottom: 16,
            }}
          >
            {success
              ? "Password Reset Successful"
              : step === 1
              ? "Forgot Password"
              : "Confirm Password Reset"}
          </Text>
          <Text style={styles.infoText}>
            {success
              ? "You can now sign in with your new password."
              : step === 1
              ? "Enter your email to receive a password reset code."
              : "Enter the code sent to your email and your new password."}
          </Text>
          {warningText ? (
            <Text style={{ color: colors.warningText, marginBottom: 8 }}>
              {warningText}
            </Text>
          ) : null}
          {!success ? (
            <>
              {step === 1 ? (
                <>
                  <CustomTextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <ActionButton
                    onPress={handleRequestReset}
                    disabled={loading}
                    loading={loading}
                    text={loading ? "Sending..." : "Send Reset Code"}
                  />
                  <View style={[styles.loginContainer, { marginTop: 16 }]}>
                    <Text style={styles.loginText}>Back to </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Login")}
                    >
                      <Text style={styles.loginLink}>Login</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <CustomTextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="Reset Code"
                    autoCapitalize="none"
                    keyboardType="number-pad"
                  />
                  {/* Password */}
                  <CustomTextInput
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      setPasswordWarning(text ? validatePassword(text) : "");
                    }}
                    placeholder="New Password"
                    secureTextEntry={true}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    eyeIconStyle={styles.eyeIcon}
                    warningText={newPassword ? passwordWarning : ""}
                  />
                  <ActionButton
                    onPress={handleConfirmReset}
                    disabled={loading}
                    loading={loading}
                    text={loading ? "Resetting..." : "Confirm Reset"}
                  />
                </>
              )}
            </>
          ) : (
            <View style={{ alignItems: "center", marginTop: 16 }}>
              <ActionButton
                onPress={() => navigation.navigate("Login")}
                text="Go to Login"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
