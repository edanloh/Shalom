import { useState } from "react";
import { COGNITO_CLIENT_ID_SMS } from "react-native-dotenv";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

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
import styles from "@/styles/styles";
import CustomTextInput from "@components/CustomTextInput";
import ActionButton from "@components/ActionButton";
import { useAuth } from "@contexts/AuthContext";
import { Colors, TextStyles } from "@/constants";
import externalStyles from "@styles/styles";

export default function SMSLoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [session, setSession] = useState("");
  const [loginWarning, setLoginWarning] = useState("");
  const { authenticateWithTokens } = useAuth();

  const handleLogin = async () => {
    if (!otpSent) {
      await handleSendOtp();
    } else {
      await handleVerifyOtp();
    }
  };

  const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Basic validation for international phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  };

  const handleSendOtp = async () => {
    if (!phone) {
      setLoginWarning("Please enter your phone number");
      return;
    }

    if (!validatePhoneNumber(phone)) {
      setLoginWarning(
        "Please enter a valid phone number with country code (e.g., +60123456789)"
      );
      return;
    }

    setLoading(true);
    setLoginWarning("");
    try {
      console.log("Sending InitiateAuth with phone:", phone);
      const result = await client.send(
        new InitiateAuthCommand({
          AuthFlow: "CUSTOM_AUTH",
          ClientId: COGNITO_CLIENT_ID_SMS,
          AuthParameters: {
            USERNAME: phone,
            phone_number: phone,
          },
          ClientMetadata: {
            phone: phone,
            phone_number: phone,
          },
        })
      );

      if (result.Session) {
        setSession(result.Session);
        setOtpSent(true);
        setLoginWarning("");
        Alert.alert("Success", "OTP sent to your phone!");
      } else {
        setLoginWarning("Failed to initiate OTP flow. Please try again.");
      }
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      if (error.__type === "NotAuthorizedException") {
        setLoginWarning(
          "Phone number not found. Please check your number or register first."
        );
      } else if (error.__type === "UserNotFoundException") {
        setLoginWarning("Phone number not registered. Please register first.");
      } else {
        setLoginWarning("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setLoginWarning("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setLoginWarning("");
    try {
      console.log("Verifying OTP with session:", session);
      const response = await client.send(
        new RespondToAuthChallengeCommand({
          ClientId: COGNITO_CLIENT_ID_SMS,
          ChallengeName: "CUSTOM_CHALLENGE",
          Session: session,
          ChallengeResponses: {
            USERNAME: phone,
            ANSWER: otp,
            phone_number: phone,
          },
          ClientMetadata: {
            phone: phone,
            phone_number: phone,
          },
        })
      );

      if (response.AuthenticationResult) {
        console.log("SMS Login Success:", response.AuthenticationResult);

        // Map AWS AuthenticationResult to expected AuthTokens format
        const tokens = {
          access_token: response.AuthenticationResult.AccessToken || "",
          id_token: response.AuthenticationResult.IdToken || "",
          refresh_token: response.AuthenticationResult.RefreshToken || "",
        };

        if (authenticateWithTokens) {
          await authenticateWithTokens(tokens);
        }

        Alert.alert(
          "Login Successful",
          "You have been logged in successfully."
        );
      } else {
        setLoginWarning("Invalid OTP. Please try again.");
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      setLoginWarning("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOtpSent(false);
    setOtp("");
    setSession("");
    setLoginWarning("");
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
              style={externalStyles.logo}
            />
          </View>
          <Text style={[TextStyles.h2]}>Shalom</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={[TextStyles.h3]}>Login with Phone Number</Text>

          {/* Phone Number */}
          <CustomTextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone Number (e.g., +18777804236)"
            keyboardType="phone-pad"
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            warningText={!otpSent ? loginWarning : ""}
            editable={!otpSent}
            style={otpSent ? { color: Colors.textMuted } : {}}
          />

          {/* OTP Input (shown only after OTP is sent) */}
          {otpSent && (
            <>
              <CustomTextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                keyboardType="numeric"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                warningText={loginWarning}
              />

              {/* Resend OTP / Change Phone */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity onPress={resetForm}>
                  <Text style={[styles.loginLink, { fontSize: 16 }]}>
                    Change Phone Number
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                  <Text style={[styles.loginLink, { fontSize: 16 }]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Login Button */}
          <ActionButton
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            text={
              loading
                ? otpSent
                  ? "Verifying..."
                  : "Sending OTP..."
                : otpSent
                ? "Verify OTP"
                : "Send OTP"
            }
          />
        </View>

        {/* Navigation Links */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("SMSRegister")}>
            <Text style={styles.loginLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.loginContainer, { marginTop: 8 }]}>
          <Text style={styles.loginText}>Need a different method? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>Email Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
