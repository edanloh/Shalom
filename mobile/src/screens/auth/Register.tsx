import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import styles from "@/styles/styles";
WebBrowser.maybeCompleteAuthSession();

import {
  COGNITO_DOMAIN,
  COGNITO_CLIENT_ID,
  API_BASE_URL,
} from "react-native-dotenv";
import colors from "@/styles/colors";

const REDIRECT_URI = makeRedirectUri();

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordWarning, setPasswordWarning] = useState("");
  const { register, loginWithGoogle } = useAuth();

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

  const checkEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dev/getUserInfo?email=${email}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user info from API Gateway");
      }
      const result = await response.json();
      if (result) {
        if (result.found == true) {
          setPasswordWarning("Email is already registered");
          console.log("Email already registered:", result.user);
        } else {
          setPasswordWarning("");
          console.log("Email not registered, proceeding to register");
          handleRegister();
        }
      }
    } catch (err: any) {
      setPasswordWarning("Error checking email");
      console.error("Error checking email:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    const warning = validatePassword(password);
    if (warning) {
      setPasswordWarning(warning);
      return;
    }
    setPasswordWarning("");
    setLoading(true);
    const success = await register(email, password, name, "learner");
    setLoading(false);

    if (!success) {
      Alert.alert("Error", "Registration failed");
    } else {
      navigation.navigate("ConfirmSignUp", { email });
    }
  };

  const handleGoogleLogin = async () => {
    const cognitoAuthUrl =
      `${COGNITO_DOMAIN}/oauth2/authorize?` +
      `identity_provider=Google` +
      `&client_id=${COGNITO_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=email%20openid%20phone`;
    const result = await WebBrowser.openAuthSessionAsync(
      cognitoAuthUrl,
      REDIRECT_URI
    );
    if (result.type === "success") {
      if (result.url) {
        const urlParams = new URLSearchParams(result.url.split("?")[1]);
        const authCode = urlParams.get("code");
        if (authCode) {
          // Exchange code for tokens
          try {
            const tokenResponse = await fetch(
              `${COGNITO_DOMAIN}/oauth2/token`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `grant_type=authorization_code&client_id=${COGNITO_CLIENT_ID}&code=${authCode}&redirect_uri=${encodeURIComponent(
                  REDIRECT_URI
                )}`,
              }
            );
            const tokens = await tokenResponse.json();
            if (tokens.id_token) {
              // Call AuthContext to set user as authenticated
              if (typeof loginWithGoogle === "function") {
                await loginWithGoogle(tokens);
              }
              // Navigation will happen automatically when isAuthenticated changes
            } else {
              Alert.alert("Error", "Failed to retrieve tokens from Cognito");
            }
          } catch (err) {
            console.error("Error exchanging code for tokens:", err);
            Alert.alert("Error", "Google login failed");
          }
        }
      }
    } else if (result.type === "dismiss") {
      console.log("Google sign-in was cancelled");
    } else {
      console.log("Cognito sign-in failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              source={require("@assets/shalom.png")}
              style={{ width: 100, height: 100, resizeMode: "contain" }}
            />
          </View>
          <Text style={styles.title}>Shalom</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text
            style={{
              fontFamily: "Lexend-Regular",
              fontSize: 22,
              color: "white",
              marginBottom: 16,
            }}
          >
            Create Your Account
          </Text>

          {/* Name */}
          <CustomTextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            autoCapitalize="words"
            returnKeyType="next"
          />

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
            onChangeText={(text) => {
              setPassword(text);
              setPasswordWarning(text ? validatePassword(text) : "");
            }}
            placeholder="Password"
            secureTextEntry={true}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            eyeIconStyle={styles.eyeIcon}
            warningText={password ? passwordWarning : ""}
            returnKeyType="go"
            onSubmitEditing={handleRegister}
          />

          {/* Sign Up Button */}
          <ActionButton
            onPress={checkEmail}
            disabled={loading}
            loading={loading}
            text={loading ? "Signing Up..." : "Sign Up"}
            style={{ marginTop: 16 }}
          />

          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              marginVertical: 4,
            }}
          >
            <View
              style={{ flex: 1, height: 0.5, backgroundColor: colors.infoText }}
            />
            <Text
              style={{
                color: colors.infoText,
                fontSize: 14,
                marginHorizontal: 8,
              }}
            >
              Or Sign In With
            </Text>
            <View
              style={{ flex: 1, height: 0.5, backgroundColor: colors.infoText }}
            />
          </View>

          {/* Social Login */}
          <View
            style={{ alignItems: "center", marginBottom: 16, marginTop: 16 }}
          >
            <TouchableOpacity
              onPress={handleGoogleLogin}
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

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
