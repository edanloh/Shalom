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
import * as WebBrowser from "expo-web-browser";
import styles from "@/styles/styles";
import { Colors, Spacing, TextStyles } from "../../constants";
import { validatePassword } from "@/utils/validatePassword";
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordWarning, setPasswordWarning] = useState("");
  const { register, loginWithGoogle, fetchEmail } = useAuth();

  // const checkEmail = async () => {
  //   // Skip checking for now
  //   handleRegister();
  //   return;
  //   setLoading(true);
  //   try {
  //     const result = await fetchEmail(email);
  //     if (result) {
  //       if (result.found == true) {
  //         setPasswordWarning("Email is already registered");
  //         console.log("Email already registered:", result.user);
  //       } else {
  //         setPasswordWarning("");
  //         console.log("Email not registered, proceeding to register");
  //         handleRegister();
  //       }
  //     }
  //   } catch (err: any) {
  //     setPasswordWarning("Error checking email");
  //     console.error("Error checking email:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
    const success = await register(email, password, name);
    setLoading(false);

    if (!success) {
      Alert.alert("Error", "Registration failed");
    } else {
      navigation.navigate("ConfirmSignUp", { email });
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              source={require("@assets/shalom.png")}
              style={styles.logo}
            />
          </View>
          <Text style={[TextStyles.h2]}>Shalom</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={TextStyles.h3}>
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
            onPress={handleRegister}
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
              style={{ flex: 1, height: 0.5, backgroundColor: Colors.textSecondary }}
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
              style={{ flex: 1, height: 0.5, backgroundColor: Colors.textSecondary }}
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
