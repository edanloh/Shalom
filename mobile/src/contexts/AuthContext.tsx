import React, { createContext, useContext, useState, useEffect } from "react";
// @ts-ignore
import { COGNITO_POOL_ID, COGNITO_CLIENT_ID } from "react-native-dotenv";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

interface User {
  id: string;
  email: string;
  name: string;
  role: "learner" | "instructor";
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Mock authentication
      const mockUser: User = {
        id: '550e8400-e29b-41d4-a716-446655440102',
        email,
        name: email.split('@')[0],
        role: 'learner',
        avatar: 'https://via.placeholder.com/150',
        bio: 'Passionate learner and technology enthusiast',
        location: 'Singapore',
        phone: '',
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.log('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, role: string): Promise<boolean> => {
    try {
      const mockUser: User = {
        // id: Date.now().toString(),
        id: '550e8400-e29b-41d4-a716-446655440102',
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
