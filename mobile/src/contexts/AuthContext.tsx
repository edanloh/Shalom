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

  const toAuthUser = useCallback((user: any): SupabaseUser => {
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || '',
      auth_provider: user.app_metadata?.provider,
      ...user,
    };
  }, []);

  const hasAllowedRole = useCallback((role?: string) => {
    return role === 'instructor' || role === 'admin';
  }, []);

  const validateAndSetAuthorizedUser = useCallback(
    async (user: any) => {
      const auth_user = toAuthUser(user);
      const check = await registerCheck(auth_user);

      if (!check?.success) {
        setAuthUser(null);
        return {
          success: false,
          error: check?.error || 'Login failed. Please try again.',
        };
      }

      if (!hasAllowedRole(check?.user?.role)) {
        setAuthUser(null);
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Unauthorized role. Access denied.',
        };
      }

      setAuthUser(auth_user);
      await fetchUserProfile(check.user.email);
      return { success: true };
    },
    [hasAllowedRole, toAuthUser],
  );

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
      setAuthUser(null);
      await supabase.auth.signOut();
      const response = await registerCheck(auth_user);
      return response;
    }
    setIsLoading(false);
  };

  const getSession = async () => {
    setIsLoading(true);
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    setIsLoading(false);
    return { data };
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