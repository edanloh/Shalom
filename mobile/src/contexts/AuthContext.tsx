import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  COGNITO_POOL_ID,
  COGNITO_CLIENT_ID,
  API_BASE_URL,
} from "react-native-dotenv";

WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: "learner" | "instructor";
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  authProvider: "google" | "email";
  accessToken?: string;
}

export interface AuthTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  confirmPasswordReset: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<boolean>;
  confirmSignUp: (email: string, code: string) => Promise<boolean>;
  loginWithGoogle: (tokens: AuthTokens) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const USER_STORAGE_KEY = "shalom_user";
if (!COGNITO_POOL_ID || !COGNITO_CLIENT_ID) {
  throw new Error("Missing Cognito configuration");
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: "ap-southeast-1",
});

const getAuthErrorMessage = (error: any): string => {
  const errorMessages: Record<string, string> = {
    NotAuthorizedException: "Invalid email or password",
    UserNotConfirmedException: "Please verify your email address",
    UserNotFoundException: "User not found",
    TooManyRequestsException: "Too many requests. Please try again later",
    InvalidParameterException: "Invalid parameters provided",
  };
  return errorMessages[error.name] || error.message || "Authentication failed";
};

const extractUserFromAttributes = (
  attributes: any[],
  username: string,
  email: string
) => {
  const nameAttr = attributes.find((attr) => attr.Name === "name");
  const roleAttr = attributes.find((attr) => attr.Name === "custom:role");
  return {
    id: username || email,
    email,
    username: username || email,
    name: nameAttr?.Value || email.split("@")[0],
    role: (roleAttr?.Value as "learner" | "instructor") || "learner",
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Set the below to skip auth during development
  // const [user, setUser] = useState<User | null>({
  //   id: "550e8400-e29b-41d4-a716-446655440101",
  //   email: "testuser@example.com",
  //   username: "testuser",
  //   name: "Test User",
  //   role: "learner",
  //   avatar:
  //     "https://ui-avatars.com/api/?name=Test+User&size=50&background=6366F1&color=fff",
  //   bio: "Learning enthusiast exploring various courses",
  //   location: "Singapore",
  //   phone: "+65 9123 4567",
  //   authProvider: "email",
  // });
  // const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const persistUser = async (userData: User) => {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const login = async (email: string, password: string) => {
    try {
      const authResponse = await cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: COGNITO_CLIENT_ID,
          AuthParameters: { USERNAME: email, PASSWORD: password },
        })
      );

      if (!authResponse.AuthenticationResult?.AccessToken) {
        return { success: false, error: "Authentication failed" };
      }

      const userResponse = await cognitoClient.send(
        new GetUserCommand({
          AccessToken: authResponse.AuthenticationResult.AccessToken,
        })
      );

      const baseUser = extractUserFromAttributes(
        userResponse.UserAttributes || [],
        userResponse.Username || email,
        email
      );

      const userData: User = {
        ...baseUser,
        authProvider: "email",
        accessToken: authResponse.AuthenticationResult.AccessToken,
      };

      await persistUser(userData);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: getAuthErrorMessage(error) };
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: string
  ) => {
    try {
      await cognitoClient.send(
        new SignUpCommand({
          ClientId: COGNITO_CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: "name", Value: name },
            { Name: "custom:role", Value: role },
          ],
        })
      );
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  const resetPassword = async (email: string) => {
    try {
      await cognitoClient.send(
        new ForgotPasswordCommand({
          ClientId: COGNITO_CLIENT_ID,
          Username: email,
        })
      );
      return true;
    } catch {
      return false;
    }
  };

  const confirmPasswordReset = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    try {
      await cognitoClient.send(
        new ConfirmForgotPasswordCommand({
          ClientId: COGNITO_CLIENT_ID,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
        })
      );
      return true;
    } catch {
      return false;
    }
  };

  const confirmSignUp = async (email: string, code: string) => {
    try {
      await cognitoClient.send(
        new ConfirmSignUpCommand({
          ClientId: COGNITO_CLIENT_ID,
          Username: email,
          ConfirmationCode: code,
        })
      );
      return true;
    } catch {
      return false;
    }
  };

  const loginWithGoogle = async (tokens: AuthTokens) => {
    try {
      const googlePayload = tokens.id_token
        ? JSON.parse(atob(tokens.id_token.split(".")[1]))
        : null;

      if (!googlePayload?.sub) {
        throw new Error("Invalid Google token");
      }

      const response = await fetch(
        `${API_BASE_URL}/dev/getUserInfo?username=${encodeURIComponent(
          googlePayload.sub
        )}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) throw new Error("Failed to fetch user info");

      const result = await response.json();
      const userInfo = result.attributes || result.body?.attributes || {};

      const userData: User = {
        id: userInfo.sub || userInfo.email || googlePayload.sub,
        email: userInfo.email,
        username: userInfo.username || userInfo.email,
        name:
          userInfo.name ||
          (userInfo.email ? userInfo.email.split("@")[0] : "GoogleUser"),
        role: userInfo["custom:role"] || "learner",
        avatar: userInfo.picture,
        phone: userInfo.phone_number,
        bio: userInfo.bio,
        location: userInfo.locale || userInfo.location,
        authProvider: "google",
        accessToken: tokens.access_token,
      };

      await persistUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      await persistUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
        confirmPasswordReset,
        confirmSignUp,
        loginWithGoogle,
        updateProfile,
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
