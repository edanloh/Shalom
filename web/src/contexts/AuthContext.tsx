import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

import { supabase } from '@/lib/supabase';

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.user)
      setAuthUser({
        id: '550e8400-e29b-41d4-a716-446655440105',
        email: data.user.email,
        name: data.user.user_metadata.full_name || '',
        auth_provider: data.user.app_metadata.provider,
        ...data.user,
      });
    // setAuthUser({ id: data.user.id, email: data.user.email, ...data.user });
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setAuthUser(null);
    setIsLoading(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isAuthenticated: authUser != null,
        isLoading,
        login,
        logout,
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
