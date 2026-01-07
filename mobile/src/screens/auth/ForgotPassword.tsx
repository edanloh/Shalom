import { useEffect, useState } from "react";
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
import styles from "@/styles/styles";
import { Colors, Spacing, TextStyles } from "@/constants";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [warningText, setWarningText] = useState("");
  const [requestEmailSent, setRequestEmailSent] = useState(false);
  const { requestResetPassword } = useAuth();

  const handleRequestReset = async () => {
    if (!email) {
      setWarningText("Please enter your email address");
      return;
    }
    setLoading(true);
    const response = await requestResetPassword(email);
    setLoading(false);
    if (response.error == null) {
      setWarningText("");
      setRequestEmailSent(true);
    } else {
      setWarningText("Failed to send reset email");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { justifyContent: "center", padding: Spacing.lg },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image source={require("@assets/shalom.png")} style={styles.logo} />
          </View>
          <Text style={[TextStyles.h2]}>Shalom</Text>
        </View>
        <View style={styles.form}>
          <Text style={TextStyles.h3}>
            {requestEmailSent ? "Request Successful" : "Forgot Password"}
          </Text>
          {requestEmailSent ? (
            <Text style={styles.infoText}>
              A password reset link has been sent to your email.
            </Text>
          ) : (
            <>
              <Text style={styles.infoText}>
                Enter your email to receive a password reset link.
              </Text>
              {warningText ? (
                <Text style={{ color: Colors.textWarning, marginBottom: 8 }}>
                  {warningText}
                </Text>
              ) : null}
              <CustomTextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={handleRequestReset}
              />
              <ActionButton
                onPress={handleRequestReset}
                disabled={loading}
                loading={loading}
                text={loading ? "Sending..." : "Send Reset Email"}
              />
              <View style={[styles.loginContainer, { marginTop: 16 }]}>
                <Text style={styles.loginText}>Back to </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
