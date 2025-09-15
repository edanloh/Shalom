import React, { createContext, useContext, useState, useEffect } from "react";
import { COGNITO_POOL_ID, COGNITO_CLIENT_ID } from "react-native-dotenv";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
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

const userPool = new CognitoUserPool(poolData);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Confirm password reset with code and new password
  const confirmPasswordReset = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve(true);
        },
        onFailure: (err) => {
          console.log("Confirm password reset error:", err);
          resolve(false);
        },
      });
    });
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
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log("Error loading stored auth:", error);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const user = new CognitoUser({ Username: email, Pool: userPool });
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: async (result) => {
          user.getUserAttributes((err, attributes) => {
            let role = "learner"; // default role
            if (!err && attributes) {
              const roleAttr = attributes.find(
                (attr) => attr.getName() === "custom:role"
              );
              if (roleAttr) {
                role = roleAttr.getValue();
              }
            }

            setUser({
              id: email,
              email,
              name: email.split("@")[0],
              role: role as "learner" | "instructor",
              authProvider: "email",
              username: user.getUsername(),
            });
            setIsAuthenticated(true);
            resolve({ success: true });
          });
        },
        onFailure: (err) => {
          console.log("Login error:", err);
          let errorMsg = "Login failed. Please try again.";
          if (err && err.message) errorMsg = err.message;
          resolve({ success: false, error: errorMsg });
        },
      });
    });
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      userPool.signUp(
        email,
        password,
        [
          new CognitoUserAttribute({ Name: "name", Value: name }),
          new CognitoUserAttribute({ Name: "custom:role", Value: role }),
        ],
        [],
        (err) => {
          if (err) {
            console.log("Register error:", err);
            resolve(false);
          } else {
            // Optionally auto-login or prompt for email verification
            resolve(true);
          }
        }
      );
    });
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);

      // Sign out from Cognito
      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        currentUser.signOut();
      }

      // Redirect to Cognito logout URL
      const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${poolData.ClientId}&logout_uri=http://localhost:8081`;
      if (typeof window !== "undefined" && window.location) {
        window.location.href = logoutUrl;
      } else {
        // For React Native mobile
        try {
          const Linking = require("react-native").Linking;
          Linking.openURL(logoutUrl);
        } catch (err) {
          console.log("Error opening logout URL:", err);
        }
      }
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: email, Pool: userPool });
      user.forgotPassword({
        onSuccess: () => resolve(true),
        onFailure: (err) => {
          console.log("Reset error:", err);
          resolve(false);
        },
      });
    });
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
    return new Promise((resolve) => {
      const user = new CognitoUser({ Username: email, Pool: userPool });
      user.confirmRegistration(code, true, (err, result) => {
        if (err) {
          console.log("ConfirmSignUp error:", err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
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