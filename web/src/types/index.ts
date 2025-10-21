export interface AuthTokens {
  IdToken: string;
  AccessToken: string;
  RefreshToken?: string;
}

export interface User {
  email: string;
  id: string;
}

export interface AuthContextType {
  tokens: AuthTokens | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
}
