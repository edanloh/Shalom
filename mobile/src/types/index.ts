// API-ready data types for the application

export interface User {
  id: string;
  name: string;
  avatar: string;
  points: number;
  email: string;
  joinedAt: string;
  profile?: {
    bio?: string;
    location?: string;
    interests?: string[];
  };
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
