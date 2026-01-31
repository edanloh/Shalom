import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';
import { registerCheck, fetchUserProfile, approveInstructor as ApproveInstructor } from '@/services/userService';

interface SupabaseUser {
  id: string;
  email: string;
  [key: string]: any;
  name: string;
  auth_provider: string;
}

interface AuthContextType {
  authUser: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (email: string, oldPassword: string, newPassword: string) => Promise<void>;
  register: ( email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  approveInstructor: (uuid: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setAuthUser({
          id: '550e8400-e29b-41d4-a716-446655440105',
          email: data.user.email,
          name: data.user.user_metadata.full_name || '',
          auth_provider: data.user.app_metadata.provider,
          ...data.user,
        });
        // setAuthUser({ id: data.user.id, email: data.user.email, ...data.user });
      } else {
        setAuthUser(null);
      }
      setIsLoading(false);
    };
    getSession();
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setAuthUser({
            id: '550e8400-e29b-41d4-a716-446655440105',
            // id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata.full_name || '',
            auth_provider: session.user.app_metadata.provider,
            ...session.user,
          });
        } else {
          setAuthUser(null);
        }
      },
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data?.user) {
        const auth_user = {
          id: '550e8400-e29b-41d4-a716-446655440105',
          email: data.user.email,
          name: data.user.user_metadata.full_name || '',
          auth_provider: data.user.app_metadata.provider,
          ...data.user,
        }
        const check = await registerCheck(auth_user);
        if (check.success) {
          if (check.user.role === 'instructor' || check.user.role === 'admin') {
            setAuthUser(auth_user);
            await fetchUserProfile(check.user.email);
          } else {
            setAuthUser(null);
            // Logout user if not instructor or admin
            await supabase.auth.signOut();
            setIsLoading(false);
            return {
              success: false,
              error: 'Unauthorized role. Access denied.',
            }
          }
        }
      }
      // setAuthUser({ id: data.user.id, email: data.user.email, ...data.user });
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

  const changePassword = async (email: string, oldPassword: string, newPassword: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      email,
      password: newPassword,
    });
    if (error) throw error;
    setIsLoading(false);
  }

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
        id: '550e8400-e29b-41d4-a716-446655440105',
        email: data.user.email,
        name: data.user.user_metadata.name || '',
        auth_provider: data.user.app_metadata.provider,
        ...data.user,
      }
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
  }

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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
