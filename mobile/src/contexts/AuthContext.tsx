import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from 'react-native-dotenv';
import { handleLogoutCleanup } from './NotificationContext';
import { supabase } from '@/lib/supabase';
import { AppState } from 'react-native';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, AuthContextType } from '@/types';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export interface AuthTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
}

export type Tokens = {
  access_token: string;
  refresh_token: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Set the below to skip auth during development
  // const [user, setUser] = useState<User | null>({
  //   id: "550e8400-e29b-41d4-a716-446655440101",
  //   email: "shalomfyp@gmail.com",
  //   username: "shalomfyp",
  //   name: "Shalom FYP",
  //   role: "learner",
  //   avatar:
  //     "https://ui-avatars.com/api/?name=Shalom+FYP&size=50&background=6366F1&color=fff",
  //   bio: "Learning enthusiast exploring various courses",
  //   location: "Singapore",
  //   phone: "+65 9123 4567",
  //   authProvider: "google",
  // });
  // const [isAuthenticated, setIsAuthenticated] = useState(true);

  const loginWithToken = async ({ access_token, refresh_token }: Tokens) => {
    console.log('[DeepLink] loginWithToken called', {
      access_token,
      refresh_token,
    });
    const signIn = async () => {
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      return await supabase.auth.refreshSession();
    };

    const {
      data: { user: supabaseUser, session: supabaseSession },
    } = await signIn();

    console.log('[DeepLink] Supabase user after setSession:', supabaseUser);
    setIsResettingPassword(true);
    setUser({
      id: supabaseUser?.id || '',
      email: supabaseUser?.email || '',
      name: supabaseUser?.user_metadata?.first_name || '',
      joined_at: supabaseUser?.created_at || '',
      last_login: supabaseUser?.last_sign_in_at || '',
      auth_provider: supabaseUser?.app_metadata?.provider || 'email',
    });
    setSession(supabaseSession || null);
  };

  const backdoor = () => {
    // Only enable for web or development
    // const mockSession: Session = {
    //   }
    // } as any;
    // const mockUser: User = {
    // };
    // setUser(mockUser);
    // setSession(mockSession);
  };

  // // Set the below to skip auth during development
  // useEffect(() => {
  //   // For development backdoor
  //   if (session === null || user === null) {
  //     backdoor();
  //   }
  // }, [session, user]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (!error) {
      setSession(data.session);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.first_name,
        joined_at: data.user.created_at || '',
        last_login: data.user.last_sign_in_at || '',
        auth_provider: data.user.app_metadata?.provider || 'email',
      });
      setIsResettingPassword(false);
    }
    return {
      success: !error,
      error: error?.message,
    };
  };

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
        },
      },
    });
    return {
      success: !error,
      error: error?.message,
    };
  };

  const logout = async () => {
    supabase.auth.signOut();
    setUser(null);
  };

  const requestResetPassword = async (email: string) => {
    const resetPasswordURL = Linking.createURL('/ResetPassword');

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordURL,
    });

    return { data, error };
  };

  const resetPassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (data) alert('Password updated successfully!');
      if (error) alert('There was an error updating your password.');
      if (!error) setIsResettingPassword(false);
      return {
        success: !error,
        error: error?.message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    console.log('Google login is currently disabled.');
    return Promise.resolve();
  };

  const fetchEmail = async (email: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/dev/getUserInfo?email=${email}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch user info from API Gateway');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching email:', error);
      throw error;
    }
  };

  // const loginWithGoogle = async (tokens: AuthTokens) => {
  //   try {
  //     const googlePayload = tokens.id_token
  //       ? JSON.parse(atob(tokens.id_token.split(".")[1]))
  //       : null;

  //     if (!googlePayload?.sub) {
  //       throw new Error("Invalid Google token");
  //     }

  //     const response = await fetch(
  //       `${API_BASE_URL}/dev/getUserInfo?username=${encodeURIComponent(
  //         googlePayload.sub
  //       )}`,
  //       { method: "GET", headers: { "Content-Type": "application/json" } }
  //     );

  //     if (!response.ok) throw new Error("Failed to fetch user info");

  //     const result = await response.json();
  //     const userInfo = result.attributes || result.body?.attributes || {};

  //     const userData: User = {
  //       id: userInfo.sub || userInfo.email || googlePayload.sub,
  //       email: userInfo.email,
  //       username: userInfo.username || userInfo.email,
  //       name:
  //         userInfo.name ||
  //         (userInfo.email ? userInfo.email.split("@")[0] : "GoogleUser"),
  //       role: userInfo["custom:role"] || "learner",
  //       avatar: userInfo.picture,
  //       phone: userInfo.phone_number,
  //       bio: userInfo.bio,
  //       location: userInfo.locale || userInfo.location,
  //       authProvider: "google",
  //       accessToken: tokens.access_token,
  //     };

  //     await persistUser(userData);
  //   } catch (error) {
  //     throw error;
  //   }
  // };

  const updateProfile = async (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      // await persistUser(updatedUser);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    return { success: true };
    // try {
    //   if (!user?.accessToken) {
    //     return { success: false, error: 'Not authenticated' };
    //   }

    //   await cognitoClient.send(
    //     new ChangePasswordCommand({
    //       AccessToken: user.accessToken,
    //       PreviousPassword: currentPassword,
    //       ProposedPassword: newPassword,
    //     })
    //   );
    //   return { success: true };
    // } catch (error: any) {
    //   return { success: false, error: getAuthErrorMessage(error) };
    // }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        session,
        login,
        register,
        logout,
        requestResetPassword,
        resetPassword,
        loginWithGoogle,
        updateProfile,
        changePassword,
        fetchEmail,
        loginWithToken,
        isResettingPassword,
        setIsResettingPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
