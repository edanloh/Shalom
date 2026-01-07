// API-ready data types for the application

import { Tokens } from '@/contexts/AuthContext';
import { Session, AuthChangeEvent, AuthResponse } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isResettingPassword: boolean;
  session: Session | null;
  login: ( email: string, password: string ) => Promise<{ success: boolean; error?: string }>;
  register: ( email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestResetPassword: (email: string) => Promise<{ data: any; error: any; }>;
  resetPassword: ( newPassword: string ) => Promise<{ success: boolean; error?: string }>;
  // loginWithGoogle: (tokens: AuthTokens) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: ( currentPassword: string, newPassword: string ) => Promise<{ success: boolean; error?: string }>;
  fetchEmail: (email: string) => Promise<any>;
  loginWithToken: (credentials: Tokens) => Promise<void>;
  setIsResettingPassword: (value: boolean) => void;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role?: 'learner' | 'instructor';
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  authProvider?: string; // e.g., 'google', 'email'
  accessToken?: string; // Store access token if needed
  points?: number; // For gamification features
  joinedAt?: string; // ISO date string
  profile?: {
    bio?: string;
    location?: string;
    interests?: string[];
  };
}

export interface CreditBalance {
  balance: number;
  lastUpdated: string;
}

export interface CreditEvent {
  id: string;
  type: string;
  title: string;
  points: number;
  courseId?: string;
  timestamp: string;
}

export interface CreditEventPayload {
  userId?: string;
  type: string;
  title: string;
  points: number;
  courseId?: string;
  timestamp?: string;
  referenceKey?: string;
}

export interface AchievementItem {
  id: string;
  icon: string;
  label: string;
}

export interface LearningGoal {
  id: string;
  label: string;
  targetHours: number;
  currentHours: number;
  streakDays?: number;
  deadline?: string;
  targetPoints?: number;
  currentPoints?: number;
  targetCourses?: number;
  currentCourses?: number;
}

export interface CertificateProgress {
  id: string;
  name: string;
  requiredPoints: number;
  earnedPoints: number;
  requiredCourses: number;
  completedCourses: number;
  progressPercent: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  value: string | number;
  color: string;
  type: 'streak' | 'certificate' | 'badge' | 'level';
  unlockedAt?: string;
  description?: string;
}

export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  category: string;
  rating: number;
  bio?: string;
  expertise?: string[];
  totalStudents?: number;
}

export interface CourseProgress {
  completed: number;
  total: number;
  percentage: number;
  lastAccessed: string;
  timeSpent?: number; // in minutes
  currentModule?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: Instructor;
  progress: CourseProgress;
  duration: string;
  rating: number;
  image: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  modules: number;
  tags?: string[];
  prerequisites?: string[];
  outcomes?: string[];
  createdAt: string;
  updatedAt: string;
  isWishlisted?: boolean;
  recommendationReason?: string;
  recommendationScore?: number;
  recommendationRank?: number;
}

export interface WeeklyGoal {
  id: string;
  userId: string;
  targetHours: number;
  currentHours: number;
  weekStartDate: string;
  weekEndDate: string;
  completed?: boolean;
  streak?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'course' | 'achievement' | 'reminder' | 'system';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// Navigation types
export type TabType = 'home' | 'courses' | 'search' | 'settings';

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// AWS API Gateway specific response structure
export interface AWSApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AWSCoursesResponse {
  courses: AWSCourse[];
  pagination: {
    currentPageSize: number;
    scannedCount: number;
    hasMore: boolean;
    nextPageToken: string | null;
    limit: number;
  };
  filters: {
    filterExpression: string | null;
    filterValue: string | null;
    sortBy: string | null;
    sortOrder: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface AWSCourse {
  courseId: number;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
    lastAccessed: string;
  };
  duration: string;
  rating: number;
  image: string;
  category: string;
  level: string;
  modules: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Search types
export interface CourseFilters {
  category?: string[];
  level?: ('beginner' | 'intermediate' | 'advanced')[];
  rating?: number;
  duration?: {
    min?: number;
    max?: number;
  };
  price?: {
    min?: number;
    max?: number;
  };
}

export interface SearchQuery {
  query: string;
  filters?: CourseFilters;
  sortBy?: 'rating' | 'price' | 'duration' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

// Navigation types
export type TabParamList = {
  Home: undefined;
  Courses: undefined;
  Search: undefined;
  Profile: undefined;
  Notifications: undefined;
  Admin?: undefined;
};

export type MainStackParamList = {
  Main: undefined;
  CourseDetail: { courseId: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  NotFound: undefined;
  UserManagement?: undefined;
  UserConfig?: undefined;
  MyCourses?: undefined;
  Auth?: undefined;
  ResetPassword?: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ConfirmSignUp: { email: string };
};
