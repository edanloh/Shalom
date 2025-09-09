import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginWarning, setLoginWarning] = useState("");
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      Alert.alert("Error", "Invalid credentials");
      setLoginWarning(result.error || "Login failed. Please try again");
    } else {
      navigation.navigate("MainScreens");
    }
  };

  const handleFacebookLogin = () => {
    Alert.alert("Info", "Facebook registration is not implemented yet");
    alert("Facebook registration is not implemented yet");
  };

  const handleGoogleLogin = () => {
    Alert.alert("Info", "Google registration is not implemented yet");
    alert("Google registration is not implemented yet");
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
              source={require("../../assets/shalom.png")}
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
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Login to your Account
          </Text>

          {/* Email */}
          <CustomTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
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
          />

          {/* Sign In Button */}
          <ActionButton
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            text={loading ? "Signing In..." : "Sign In"}
          />
        </View>

        {/* Social Login */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "#aaaaab", marginBottom: 8 }}>
            - Or Sign In With -
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            <ActionButton
              onPress={handleFacebookLogin}
              disabled={loading}
              loading={loading}
              variant="secondary"
              imageSource={require("../../assets/facebook.png")}
              style={styles.buttonSecondary}
              imageStyle={styles.image}
            />
            <ActionButton
              onPress={handleGoogleLogin}
              disabled={loading}
              loading={loading}
              variant="secondary"
              imageSource={require("../../assets/google.png")}
              style={styles.buttonSecondary}
              imageStyle={styles.image}
            />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2f2f37" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center" },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffffff",
    marginBottom: 8,
    letterSpacing: 1,
    fontFamily: "Lexend-Regular",
  },
  buttonSecondary: {
    backgroundColor: "#3e3e47",
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  image: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  form: {
    borderRadius: 16,
    padding: 24,
  },
  eyeIcon: { padding: 16 },
  loginContainer: { flexDirection: "row", justifyContent: "center" },
  loginText: { color: "#aaaaab", fontSize: 14 },
  loginLink: { color: "#564beb", fontSize: 14, fontWeight: "600" },
});
