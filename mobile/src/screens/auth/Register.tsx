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

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordWarning, setPasswordWarning] = useState("");
  const { register } = useAuth();

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

  const handleFacebookRegister = () => {
    Alert.alert("Info", "Facebook registration is not implemented yet");
    alert("Facebook registration is not implemented yet");
  };

  const handleGoogleRegister = () => {
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
              color: "#fff",
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
          />

          {/* Email */}
          <CustomTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email (Please use a real email)"
            keyboardType="email-address"
            autoCapitalize="none"
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
          />

          {/* Confirm Password removed */}

          {/* Sign Up Button */}
          <ActionButton
            onPress={handleRegister}
            disabled={loading}
            loading={loading}
            text={loading ? "Signing Up..." : "Sign Up"}
          />
        </View>

        {/* Social Login */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "#aaaaab", marginBottom: 8 }}>
            - Or Sign Up With -
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}
          >
            <ActionButton
              onPress={handleFacebookRegister}
              disabled={loading}
              loading={loading}
              variant="secondary"
              imageSource={require("@assets/facebook.png")}
              style={styles.buttonSecondary}
              imageStyle={styles.image}
            />
            <ActionButton
              onPress={handleGoogleRegister}
              disabled={loading}
              loading={loading}
              variant="secondary"
              imageSource={require("@assets/google.png")}
              style={styles.buttonSecondary}
              imageStyle={styles.image}
            />
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
  subtitle: { fontSize: 16, color: "#6b7280" },
  form: {
    borderRadius: 16,
    padding: 24,
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
  picker: { flex: 1, height: 50 },
  eyeIcon: { padding: 16 },
  loginContainer: { flexDirection: "row", justifyContent: "center" },
  loginText: { color: "#aaaaab", fontSize: 14 },
  loginLink: { color: "#564beb", fontSize: 14, fontWeight: "600" },
});
