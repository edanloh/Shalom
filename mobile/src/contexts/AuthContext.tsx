import { useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthContext } from './AuthContextStore';

import { supabase } from '@/lib/supabase';
import {
  registerCheck,
  fetchUserProfile,
  approveInstructor as ApproveInstructor,
} from '@/services/userService';

interface SupabaseUser {
  id: string;
  email: string;
  [key: string]: any;
  name: string;
  auth_provider: string;
}

export interface AuthContextType {
  authUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (
    email: string,
    oldPassword: string,
    newPassword: string,
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  approveInstructor: (uuid: string) => Promise<any>;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginWithToken = async ({ access_token, refresh_token, type }: Tokens & { type?: string }) => {
    setIsLoading(true);
    const {
      data: { user: supabaseUser, session: supabaseSession },
    } = await supabase.auth.setSession({ access_token, refresh_token });
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
      setIsLoading(false);
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
    const getSession = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          setAuthUser(null);
        } else if (data?.user) {
          await validateAndSetAuthorizedUser(data.user);
        } else {
          setAuthUser(null);
        }
      } catch (err) {
        setAuthUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    getSession();
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const syncAuthState = async () => {
          setIsLoading(true);
          try {
            if (session?.user) {
              await validateAndSetAuthorizedUser(session.user);
            } else {
              setAuthUser(null);
            }
          } finally {
            setIsLoading(false);
          }
        };
        void syncAuthState();
      },
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [validateAndSetAuthorizedUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data?.user) {
        return await validateAndSetAuthorizedUser(data.user);
      }
      setAuthUser(null);
      return {
        success: false,
        error: 'Login failed. Please try again.',
      };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const approveInstructor = async (id: string) => {
    const sessionResponse = await supabase.auth.getSession();
    const accessToken = sessionResponse.data.session?.access_token;
    const response = await ApproveInstructor(id, accessToken);
    return response;
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setAuthUser(null);
    setIsLoading(false);
    window.location.href = '/login';
  };

  const changePassword = async (
    email: string,
    oldPassword: string,
    newPassword: string,
  ) => {
    setIsLoading(true);
    try {
      // Step 1: Re-authenticate user with current password to verify it's correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        throw new Error('Invalid current password');
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: name,
          name: name,
          role: 'instructor',
        },
      },
    });
    if (error) throw error;
    if (data?.user) {
      const auth_user = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name || '',
        auth_provider: data.user.app_metadata.provider,
        ...data.user,
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
      console.log('Opening browser for Google OAuth with URL:', data?.url);
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          console.log("OAuth result:", result);
          // Parse the fragment after '#'
          const fragment = result.url.split('#')[1];
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await loginWithToken({ access_token, refresh_token, type: 'google' });
          } else {
            throw new Error('Tokens not found in OAuth result');
          }
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
        authUser,
        isAuthenticated: authUser != null,
        isLoading,
        login,
        logout,
        changePassword,
        register,
        approveInstructor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};