export interface AuthTokens {
  IdToken: string;
  AccessToken: string;
  RefreshToken?: string;
}

export interface User {
  id: string;
  uuid?: string; // db users table id
  email: string;
  name: string;
  bio?: string;
  location?: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  points?: number; // For gamification features
  joined_at?: string; // ISO date string
  last_login?: string; // ISO date string
  is_active?: boolean;
  auth_provider: string; // e.g., 'google', 'email'
  // id uuid not null default gen_random_uuid (),
  // email character varying(255) not null,
  // name character varying(255) not null,
  // avatar_url text null,
  // points integer null default 0,
  // joined_at timestamp with time zone null default CURRENT_TIMESTAMP,
  // last_login timestamp with time zone null,
  // is_active boolean null default true,
  // created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  // updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
}

export interface AuthContextType {
  tokens: AuthTokens | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
}
