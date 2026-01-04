import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Colors, Typography, Spacing, TextStyles } from "../../constants";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../types";
import styles from "@/styles/styles";

import { useRoute } from "@react-navigation/native";

export default function ConfirmSignUp({ navigation, route }: any) {
  // const route = useRoute();
  // @ts-ignore
  const initialEmail = route.params?.email || "";
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [warningText, setWarningText] = useState("");
  const { confirmSignUp } = useAuth();
  // const navigation =
  //   useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { justifyContent: "center", padding: Spacing.lg },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              source={require("@assets/shalom.png")}
              style={styles.logo}
            />
          </View>
          <Text style={[TextStyles.h2]}>Shalom</Text>
        </View>
        <View style={styles.form}>
          <Text style={TextStyles.h3}>
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
