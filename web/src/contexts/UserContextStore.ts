import { createContext } from "react";
import type { UserContextType } from './useUser';

export const UserContext = createContext<UserContextType | null>(null);
