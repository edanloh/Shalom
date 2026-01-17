import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import styles from "@/styles/styles";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";
import { Colors, Spacing, TextStyles } from "@/constants";
import externalStyles from "@styles/styles";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginWarning, setLoginWarning] = useState("");
  const { login, loginWithGoogle } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setLoginWarning("Please fill in all the fields");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setLoginWarning(result.error || "Login failed. Please try again");
      setLoading(false);
    }
    // Navigation will happen automatically when Supabase session state changes
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              source={require("@assets/shalom.png")}
              style={externalStyles.logo}
            />
          </View>
          <Text style={[TextStyles.h2]}>Shalom</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={[TextStyles.h3]}>Login to your Account</Text>

          {/* Email */}
          <CustomTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />

          {/* Password */}
          <CustomTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={true}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            eyeIconStyle={styles.eyeIcon}
            warningText={loginWarning}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <View style={{ justifyContent: "flex-start" }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPassword")}
              style={{ alignSelf: "flex-start" }}
            >
              <Text style={[styles.loginLink, { marginBottom: 16 }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <ActionButton
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            text={loading ? "Signing In..." : "Sign In"}
          />

          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              marginVertical: 4,
            }}
          >
            <View
              style={{
                flex: 1,
                height: 0.5,
                backgroundColor: Colors.textSecondary,
              }}
            />
            <Text
              style={{
                color: Colors.textSecondary,
                fontSize: 14,
                marginHorizontal: 8,
              }}
            >
              Or Sign In With
            </Text>
            <View
              style={{
                flex: 1,
                height: 0.5,
                backgroundColor: Colors.textSecondary,
              }}
            />
          </View>

          {/* Social Login */}
          <View
            style={{ alignItems: "center", marginBottom: 16, marginTop: 16 }}
          >
            <TouchableOpacity
              onPress={loginWithGoogle}
              disabled={loading}
              style={[
                {
                  width: "70%",
                  maxWidth: 200,
                  borderRadius: 24,
                },
              ]}
            >
              <Image
                source={require("@assets/google-pill.png")}
                style={[{ width: "100%", height: 48, resizeMode: "contain" }]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Register Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.loginLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
