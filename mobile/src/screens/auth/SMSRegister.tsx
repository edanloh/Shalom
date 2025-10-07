import { useState } from "react";
import { COGNITO_CLIENT_ID_SMS } from "react-native-dotenv";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
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
import { Colors, TextStyles } from "@/constants";
import externalStyles from "@styles/styles";

export default function SMSRegisterScreen({ navigation }: any) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingRegistration, setConfirmingRegistration] = useState(false);
  const [signupCode, setSignupCode] = useState("");
  const [registrationWarning, setRegistrationWarning] = useState("");
  const [authSession, setAuthSession] = useState("");

  const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Basic validation for international phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  };

  const handleSignUp = async () => {
    if (!validatePhoneNumber(phone)) {
      setRegistrationWarning(
        "Please enter a valid phone number with country code (e.g., +60123456789)"
      );
      return;
    }
    setLoading(true);
    setRegistrationWarning("");
    try {
      console.log("Creating user with phone:", phone);

      // Step 1: Create user (you might need admin privileges for this)
      // Alternative: Use SignUpCommand with MessageAction: "SUPPRESS"
      const signUpResult = await client.send(
        new SignUpCommand({
          ClientId: COGNITO_CLIENT_ID_SMS,
          Username: phone,
          Password: "TempPassword123!", // Temporary password
          UserAttributes: [
            { Name: "phone_number", Value: phone },
            { Name: "name", Value: phone },
          ],
          // MessageAction: "SUPPRESS", // This prevents Cognito from sending SMS (not supported in SignUpCommand)
        })
      );

      console.log("SignUp result:", signUpResult);

      // Step 2: Immediately initiate custom auth flow to send OTP via Twilio
      const authResult = await client.send(
        new InitiateAuthCommand({
          AuthFlow: "CUSTOM_AUTH",
          ClientId: COGNITO_CLIENT_ID_SMS,
          AuthParameters: {
            USERNAME: phone,
          },
          ClientMetadata: {
            authFlow: "REGISTRATION_VERIFICATION",
          },
        })
      );

      console.log("Auth challenge initiated:", authResult);

      if (authResult.Session) {
        setAuthSession(authResult.Session);
        setConfirmingRegistration(true);
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      if (error.__type === "UsernameExistsException") {
        setRegistrationWarning(
          "Phone number already registered. Please log in instead."
        );
      } else if (error.__type === "InvalidParameterException") {
        setRegistrationWarning(
          "Invalid phone number format. Please use international format (e.g., +60123456789)"
        );
      } else {
        setRegistrationWarning(
          `Registration failed: ${error.message || "Please try again."}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSignUp = async () => {
    if (!signupCode || !authSession) {
      setRegistrationWarning("Please enter the confirmation code");
      return;
    }
    setLoading(true);
    setRegistrationWarning("");

    try {
      // Verify OTP using custom auth challenge
      const result = await client.send(
        new RespondToAuthChallengeCommand({
          ClientId: COGNITO_CLIENT_ID_SMS,
          ChallengeName: "CUSTOM_CHALLENGE",
          Session: authSession,
          ChallengeResponses: {
            USERNAME: phone,
            ANSWER: signupCode,
          },
        })
      );

      console.log("Challenge response result:", result);

      if (result.AuthenticationResult?.AccessToken) {
        // Success - user is now confirmed and authenticated
        setConfirmingRegistration(false);
        setRegistrationWarning("");
      } else if (result.Session) {
        setAuthSession(result.Session);
        setRegistrationWarning("Invalid OTP. Please try again.");
      } else {
        // Fallback case
        setConfirmingRegistration(false);
        setRegistrationWarning("");
      }
    } catch (error: any) {
      console.error("Confirm signup error:", error);

      // Keep your existing error handling as backup
      if (error.__type === "UserNotConfirmedException") {
        console.log("Fallback: User confirmed but auth failed due to timing");
        setConfirmingRegistration(false);
        setRegistrationWarning(
          "Registration successful! Redirecting to login..."
        );

        setTimeout(() => {
          navigation.navigate("SMSLogin");
        }, 2000);
      } else {
        setRegistrationWarning(
          "Invalid OTP. Please check the code and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupCode = async () => {
    setLoading(true);
    setRegistrationWarning("");
    try {
      console.log("Resending confirmation code for:", phone);

      // Initiate new auth challenge to send new OTP
      const result = await client.send(
        new InitiateAuthCommand({
          AuthFlow: "CUSTOM_AUTH",
          ClientId: COGNITO_CLIENT_ID_SMS,
          AuthParameters: {
            USERNAME: phone,
          },
          ClientMetadata: {
            authFlow: "REGISTRATION_VERIFICATION",
          },
        })
      );

      console.log("Resend auth challenge:", result);

      if (result.Session) {
        setAuthSession(result.Session);
        setRegistrationWarning("");
      }
    } catch (error: any) {
      console.error("Resend signup code error:", error);
      console.error("Resend error details:", JSON.stringify(error, null, 2));

      if (error.__type === "LimitExceededException") {
        setRegistrationWarning(
          "Too many attempts. Please wait before trying again."
        );
      } else {
        setRegistrationWarning(
          `Failed to resend code: ${error.message || "Please try again."}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetRegistrationFlow = () => {
    setConfirmingRegistration(false);
    setSignupCode("");
    setRegistrationWarning("");
    setAuthSession("");
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
          <Text style={[TextStyles.h3]}>Register with Phone Number</Text>

          {!confirmingRegistration ? (
            <>
              {/* Phone Number */}
              <CustomTextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone Number (e.g., +18777804236)"
                keyboardType="phone-pad"
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={handleSignUp}
                warningText={registrationWarning}
              />

              {/* Register Button */}
              <ActionButton
                onPress={handleSignUp}
                disabled={loading}
                loading={loading}
                text={loading ? "Signing up..." : "Register"}
              />
            </>
          ) : (
            <>
              {/* Phone Number (Read-only) */}
              <CustomTextInput
                value={phone}
                onChangeText={() => {}} // Read-only
                placeholder="Phone Number"
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={false}
                style={{ color: Colors.textMuted }}
              />

              {/* Confirmation Code Input */}
              <CustomTextInput
                value={signupCode}
                onChangeText={setSignupCode}
                placeholder="Confirmation Code"
                keyboardType="numeric"
                warningText={registrationWarning}
                returnKeyType="go"
                onSubmitEditing={handleConfirmSignUp}
              />

              {/* Action Buttons */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <TouchableOpacity onPress={resetRegistrationFlow}>
                  <Text style={[styles.loginLink, { fontSize: 14 }]}>
                    Change Phone Number
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResendSignupCode}
                  disabled={loading}
                >
                  <Text style={[styles.loginLink, { fontSize: 14 }]}>
                    Resend Code
                  </Text>
                </TouchableOpacity>
              </View>

              <ActionButton
                onPress={handleConfirmSignUp}
                disabled={loading}
                loading={loading}
                text={loading ? "Verifying..." : "Confirm Registration"}
              />
            </>
          )}
        </View>

        {/* Navigation Links */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("SMSLogin")}>
            <Text style={styles.loginLink}>Login</Text>
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
