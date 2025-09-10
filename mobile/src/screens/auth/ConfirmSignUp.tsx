import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/AuthNavigator";

import { useRoute } from "@react-navigation/native";

const ConfirmSignUp = () => {
  const route = useRoute();
  // @ts-ignore
  const initialEmail = route.params?.email || "";
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [warningText, setWarningText] = useState("");
  const { confirmSignUp } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleConfirm = async () => {
    setLoading(true);
    const success = await confirmSignUp(initialEmail, code);
    setLoading(false);
    if (success) {
      setConfirmed(true);
      setWarningText("");
    } else {
      setWarningText("Invalid code. Please try again");
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
              color: "#fff",
              marginBottom: 16,
            }}
          >
            {confirmed ? "Confirmation Successful" : "Confirm Your Account"}
          </Text>
          <Text style={styles.infoText}>
            {confirmed
              ? "Please sign in with your email and password"
              : "Please check your email for the confirmation code"}
          </Text>
          {!confirmed ? (
            <>
              <CustomTextInput
                value={code}
                onChangeText={setCode}
                placeholder="Confirmation Code"
                autoCapitalize="none"
                keyboardType="number-pad"
                warningText={warningText}
              />
              <ActionButton
                onPress={handleConfirm}
                disabled={loading}
                loading={loading}
                text={loading ? "Confirming..." : "Confirm"}
              />
            </>
          ) : (
            <View style={{ alignItems: "center", marginTop: 16 }}>
              <ActionButton
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
                loading={loading}
                text={"Go to Login"}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2f2f37" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 20 },
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
  form: {
    borderRadius: 16,
    padding: 24,
  },
  infoText: {
    color: "#aaaaab",
    fontSize: 14,
    marginBottom: 16,
    fontFamily: "Lexend-Light",
  },
});

export default ConfirmSignUp;
