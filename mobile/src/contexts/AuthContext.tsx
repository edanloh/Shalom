import React, { createContext, useContext, useState, useEffect } from "react";
import { COGNITO_POOL_ID, COGNITO_CLIENT_ID } from "react-native-dotenv";

import AsyncStorage from "@react-native-async-storage/async-storage";

// Using AWS SDK v3 for React Native compatibility
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

console.log(
  "🔐 AuthContext: AWS SDK v3 imported successfully (React Native compatible)"
);
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: "learner" | "instructor";
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  authProvider: string; // e.g., 'google', 'email'
  accessToken?: string; // Store access token if needed
}

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    role: string
  ) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => void;
  confirmSignUp: (email: string, code: string) => Promise<boolean>;
  loginWithGoogle: (tokens: any) => Promise<void>;
  confirmPasswordReset: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<boolean>;
}

const REDIRECT_URI = makeRedirectUri();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// @ts-ignore
import { API_BASE_URL, COGNITO_DOMAIN } from "react-native-dotenv";

const poolData = {
  UserPoolId: COGNITO_POOL_ID,
  ClientId: COGNITO_CLIENT_ID,
};

if (!poolData.UserPoolId || !poolData.ClientId) {
  throw new Error(
    "Cognito UserPoolId and ClientId must be defined in environment variables."
  );
}

// Create AWS SDK client (React Native compatible)
const cognitoClient = new CognitoIdentityProviderClient({
  region: "ap-southeast-1", // Singapore region to match your User Pool
});

console.log(
  "🔐 AuthContext: AWS SDK CognitoIdentityProviderClient created successfully"
);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Confirm password reset with code and new password
  const confirmPasswordReset = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      console.log("🔐 Starting AWS SDK confirm password reset for:", email);

      const confirmPasswordCommand = new ConfirmForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await cognitoClient.send(confirmPasswordCommand);
      console.log("✅ AWS SDK confirm password reset successful");
      return true;
    } catch (error: any) {
      console.error("❌ AWS SDK confirm password reset error:", error);
      return false;
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Google login handler: expects tokens from Cognito
  const loginWithGoogle = async (tokens: any) => {
    try {
      // Call your API Gateway endpoint to get full user info
      const username = tokens.id_token
        ? JSON.parse(atob(tokens.id_token.split(".")[1])).sub
        : undefined;
      if (!username) throw new Error("No username (sub) found in id_token");
      const response = await fetch(
        `${API_BASE_URL}/dev/getUserInfo?username=${encodeURIComponent(
          username
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user info from API Gateway");
      }
      const result = await response.json();
      const userInfo = result.attributes || result.body?.attributes || {};
      const userData: User = {
        id: userInfo.sub || userInfo.email || username,
        email: userInfo.email,
        name:
          userInfo.name ||
          (userInfo.email ? userInfo.email.split("@")[0] : "GoogleUser"),
        username: userInfo.username,
        role: userInfo["custom:role"] || "learner",
        avatar: userInfo.picture,
        phone: userInfo.phone_number,
        bio: userInfo.bio,
        location: userInfo.locale || userInfo.location,
        authProvider: "google",
        accessToken: tokens.access_token, // Store access token if needed
      };
      setUser(userData);
      setIsAuthenticated(true);
      await AsyncStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log("Loaded stored user:", parsedUser.email);
      }
    } catch (error) {
      console.log("Error loading stored auth:", error);
      // Clear invalid stored data
      await AsyncStorage.removeItem("user");
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log("🔐 Starting AWS SDK login process for:", email);
    console.log("🔐 Using COGNITO_POOL_ID:", COGNITO_POOL_ID);
    console.log("🔐 Using COGNITO_CLIENT_ID:", COGNITO_CLIENT_ID);

    try {
      // Step 1: Authenticate with AWS Cognito using SDK
      const authCommand = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      console.log("🔐 Calling AWS SDK InitiateAuthCommand...");
      const authResponse = await cognitoClient.send(authCommand);
      console.log("✅ AWS SDK authentication successful");

      if (authResponse.AuthenticationResult?.AccessToken) {
        // Step 2: Get user attributes using the access token
        const getUserCommand = new GetUserCommand({
          AccessToken: authResponse.AuthenticationResult.AccessToken,
        });

        const userResponse = await cognitoClient.send(getUserCommand);
        console.log("✅ Got user attributes from AWS SDK");

        // Extract user information
        const attributes = userResponse.UserAttributes || [];
        const roleAttr = attributes.find((attr) => attr.Name === "custom:role");
        const nameAttr = attributes.find((attr) => attr.Name === "name");

        const userData = {
          id: userResponse.Username || email,
          email,
          name: nameAttr?.Value || email.split("@")[0],
          role: (roleAttr?.Value as "learner" | "instructor") || "learner",
          authProvider: "email",
          username: userResponse.Username || email,
          accessToken: authResponse.AuthenticationResult.AccessToken,
        };

        console.log("✅ Setting user data:", userData);
        setUser(userData);
        setIsAuthenticated(true);

        // Store user data in AsyncStorage for persistence
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        console.log("✅ User data stored in AsyncStorage");

        console.log("✅ AWS SDK login process completed successfully");
        return { success: true };
      } else {
        console.error("❌ No access token in authentication response");
        return {
          success: false,
          error: "Authentication failed - no access token",
        };
      }
    } catch (error: any) {
      console.error("❌ AWS SDK login error:", error);

      let errorMsg = "Login failed. Please try again.";
      if (error.name === "NotAuthorizedException") {
        errorMsg = "Invalid email or password";
      } else if (error.name === "UserNotConfirmedException") {
        errorMsg = "Please verify your email address";
      } else if (error.name === "UserNotFoundException") {
        errorMsg = "User not found";
      } else if (error.message) {
        errorMsg = error.message;
      }

      console.error("❌ Login failed with error:", errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: string
  ): Promise<boolean> => {
    try {
      console.log("🔐 Starting AWS SDK registration for:", email);

      const signUpCommand = new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "name", Value: name },
          { Name: "custom:role", Value: role },
        ],
      });

      const result = await cognitoClient.send(signUpCommand);
      console.log("✅ AWS SDK registration successful:", result);
      return true;
    } catch (error: any) {
      console.error("❌ AWS SDK registration error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log("🔐 Starting logout process");
      await AsyncStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);

      console.log("✅ User logged out successfully");
    } catch (error) {
      console.log("❌ Logout error:", error);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      console.log("🔐 Starting AWS SDK forgot password for:", email);

      const forgotPasswordCommand = new ForgotPasswordCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
      });

      await cognitoClient.send(forgotPasswordCommand);
      console.log("✅ AWS SDK forgot password successful");
      return true;
    } catch (error: any) {
      console.error("❌ AWS SDK forgot password error:", error);
      return false;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const confirmSignUp = async (
    email: string,
    code: string
  ): Promise<boolean> => {
    try {
      console.log("🔐 Starting AWS SDK confirm signup for:", email);

      const confirmCommand = new ConfirmSignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      });

      await cognitoClient.send(confirmCommand);
      console.log("✅ AWS SDK confirm signup successful");
      return true;
    } catch (error: any) {
      console.error("❌ AWS SDK confirm signup error:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        resetPassword,
        updateProfile,
        confirmSignUp,
        loginWithGoogle,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
