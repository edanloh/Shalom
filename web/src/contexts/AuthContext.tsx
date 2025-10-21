import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { AuthTokens, User, AuthContextType } from "@/types";
import { parseJwt } from "../lib/utils";
import { AUTH_STORAGE_KEY } from "@/env";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore tokens from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTokens(parsed);
        // Optionally decode JWT for user info
        setUser(parseJwt(parsed.IdToken));
      } catch {
        // Failed to parse stored tokens, ignore and continue
      }
    }
    setIsLoading(false);
  }, []);

  // Store tokens in localStorage when set
  useEffect(() => {
    if (tokens) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
      setUser(parseJwt(tokens.IdToken));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    }
  }, [tokens]);

  const login = (newTokens: AuthTokens) => {
    setTokens(newTokens);
  };

  const logout = () => {
    setTokens(null);
    setUser(null);
    // Optionally redirect to login page
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        tokens,
        user,
        isAuthenticated: !!tokens,
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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
