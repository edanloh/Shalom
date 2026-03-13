import { createContext } from "react";
import type { AuthContextType } from './useAuth';

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
