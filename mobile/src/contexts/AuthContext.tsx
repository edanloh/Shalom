import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL } from 'react-native-dotenv';
import { handleLogoutCleanup } from './NotificationContext';
import { supabase } from '@/lib/supabase';
import { AppState } from 'react-native';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, AuthContextType } from '@/types';
import { useNavigation } from "@react-navigation/native";

WebBrowser.maybeCompleteAuthSession();

export interface AuthTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [resetState , setResetState] = useState<AuthChangeEvent | null>(null);

  const getSession = () => session;

  useEffect(() => {
    // On mount, get the current session and subscribe to auth state changes
    const getSessionAndSubscribe = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && session.user) {
        let provider: 'email' | 'google' = 'email';
        if (session.user.app_metadata?.provider === 'google')
          provider = 'google';
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.first_name,
          authProvider: provider,
          accessToken: session.access_token,
        };
        setUser(userData);
        setSession(session);
        // Initial save to userService
        import('../services/userService').then(({ updateUserProfile }) => {
          updateUserProfile(userData.id, {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            // Add more fields if needed
          }).catch(() => {});
        });
      } else {
        setUser(null);
        setSession(null);
      }
      setIsLoading(false);
    };
    getSessionAndSubscribe();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setResetState(event);
          console.log('session is now', session)
          const navigation = useNavigation<any>();
          console.log('Navigate to forgot password from callback');
          navigation.navigate('ForgotPassword');
        } else if (session && session.user) {
          let provider: 'email' | 'google' = 'email';
          if (session.user.app_metadata?.provider === 'google')
            provider = 'google';
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.first_name,
            authProvider: provider,
            accessToken: session.access_token,
          };
          setUser(userData);
          setSession(session);
          // Initial save to userService
          import('../services/userService').then(({ updateUserProfile }) => {
            updateUserProfile(userData.id, {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              // Add more fields if needed
            }).catch(() => {});
          });
        } else {
          setUser(null);
          setSession(null);
        }
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

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
          first_name: name,
          role: 'learner',
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

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const confirmPasswordReset = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (data) alert("Password updated successfully!")
    if (error) alert("There was an error updating your password.")
    return {
      success: !error,
      error: error?.message,
    };
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
        resetState,
        login,
        register,
        logout,
        resetPassword,
        confirmPasswordReset,
        loginWithGoogle,
        updateProfile,
        changePassword,
        fetchEmail,
        getSession,
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
