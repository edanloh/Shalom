import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from 'react-native-dotenv';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User, AuthContextType } from '@/types';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

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
  const bypassAuth = false;
  const bypassUserId =
    process.env.EXPO_PUBLIC_BYPASS_USER_ID || '550e8400-e29b-41d4-a716-446655440101';
  const bypassEmail =
    process.env.EXPO_PUBLIC_BYPASS_USER_EMAIL || 'shalomfyp@gmail.com';

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

  const loginWithToken = async ({ access_token, refresh_token, type }: Tokens & { type?: string }) => {
    console.log('[DeepLink] loginWithToken called', {
      access_token,
      refresh_token,
    });
    setIsLoading(true);
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
    if (type === 'recovery') {
      setIsResettingPassword(true);
      setUser({
        id: supabaseUser?.id || '',
        email: supabaseUser?.email || '',
        name: supabaseUser?.user_metadata?.first_name || '',
        joined_at: supabaseUser?.created_at || '',
        last_login: supabaseUser?.last_sign_in_at || '',
        auth_provider: supabaseUser?.app_metadata?.provider || 'email',
      });
    } else {
      // Google login
      setUser({
        id: supabaseUser?.id || '',
        email: supabaseUser?.email || '',
        name: supabaseUser?.user_metadata?.name || '',
        joined_at: supabaseUser?.created_at || '',
        last_login: supabaseUser?.last_sign_in_at || '',
        auth_provider: supabaseUser?.app_metadata?.provider || 'email',
      });
    }
    setSession(supabaseSession || null);
  };

  // // Set the below to skip auth during development
  // useEffect(() => {
  //   // For development backdoor
  //   if (session === null || user === null) {
  //     backdoor();
  //   }
  // }, [session, user]);
  useEffect(() => {
    if (!bypassAuth) return;
    setUser({
      id: bypassUserId,
      email: bypassEmail,
      username: 'shalomfyp',
      name: 'Shalom FYP',
      role: 'learner',
      avatar:
        'https://ui-avatars.com/api/?name=Shalom+FYP&size=50&background=6366F1&color=fff',
      bio: 'Learning enthusiast exploring various courses',
      location: 'Singapore',
      phone: '+65 9123 4567',
      authProvider: 'dev',
    });
    setSession({} as Session);
  }, [bypassAuth, bypassEmail, bypassUserId]);

  const login = async (email: string, password: string) => {
    if (bypassAuth) {
      return { success: true, error: undefined };
    }
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
    if (bypassAuth) {
      return { success: true, error: undefined };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: name,
        },
      },
    });
    return {
      success: data.session != null && data.user != null,
      error:
        error?.message ||
        (data.session == null || data.user == null
          ? 'Registration failed'
          : undefined),
    };
  };

  const logout = async () => {
    if (bypassAuth) {
      return;
    }
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

  // Supabase Google OAuth for Expo Android
  const loginWithGoogle = async () => {
    try {
      // Use a custom redirect URI for Expo (must be whitelisted in Supabase dashboard)
      const redirectTo = makeRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      // Open the returned URL in a browser for the user to complete Google login
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );
        if (result.type === 'success' && result.url) {
          // Parse the URL fragment for access_token, refresh_token, etc.
          const url = result.url;
          const params = Linking.parse(url);
          // After redirect, Supabase should handle session automatically if storage is set up
          // Fetch the session from Supabase
          const { data: sessionData } = await supabase.auth.getSession();
          setSession(sessionData.session);
          const supabaseUser = sessionData.session?.user;
          setUser(
            supabaseUser
              ? {
                  id: supabaseUser.id,
                  email: supabaseUser.email || '',
                  name: supabaseUser.user_metadata?.name || '',
                  joined_at: supabaseUser.created_at || '',
                  last_login: supabaseUser.last_sign_in_at || '',
                  auth_provider:
                    supabaseUser.app_metadata?.provider || 'google',
                }
              : null
          );
        } else {
          throw new Error('Google sign-in cancelled or failed');
        }
      } else {
        throw new Error('No URL returned from Supabase OAuth');
      }
    } catch (err) {
      alert('Google sign-in failed: ' + err);
    } finally {
      setIsLoading(false);
    }
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

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!user?.email) {
      return { success: false, error: 'User email not found' };
    }
    // Step 1: Re-authenticate user with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      return { success: false, error: 'Current password is incorrect' };
    }
    // Step 2: Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      return { success: false, error: updateError.message };
    }
    return { success: true };
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
