import type { NavigatorScreenParams } from '@react-navigation/native';

export type CourseDetailSourceScreen = "Home" | "Courses" | "MyCourses";

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabNavParamList>;
  CourseDetail: { courseId: string; sourceScreen?: CourseDetailSourceScreen };
  ModuleDetail: {
    courseId: string;
    sectionId: string;
    userId?: string;
    sourceScreen?: CourseDetailSourceScreen;
    videoCompleted?: boolean;
    quizCompleted?: boolean;
    documentCompleted?: boolean; // Covers PDF, DOCX, PPTX
    completedVideoId?: string;
    completedQuizId?: string;
    completedDocumentId?: string; // Covers all document types
    timestamp?: number;
  };
  VideoPlayer: { videoId: string; courseId: string; sectionId?: string; userId?: string; sourceScreen?: CourseDetailSourceScreen };
  QuizScreen: { quizId: string; courseId: string; sectionId?: string; userId?: string; sourceScreen?: CourseDetailSourceScreen };
  DocumentView: { documentId: string; courseId: string; sectionId?: string; userId?: string; sourceScreen?: CourseDetailSourceScreen; documentType?: 'pdf' | 'document' | 'ppt' };
  LeaveReview: { courseId: string };
  Settings: undefined;
  EditProfile: undefined;
  MyCourses: undefined;
  Wishlist: undefined;
  UserManagement: undefined;
  UserConfig: undefined;
  TestScreen: undefined;
  PointsHistory: undefined;
  AchievementsScreen: undefined;
  CertificatesScreen: undefined;
  LearningGoalScreen: undefined;
  CreditsShop: undefined;
  ChangePassword: undefined;
  ResetPassword: undefined;
  Conversation: { conversationId: string };
  ConversationProfile: { conversation: { id: string | number; name: string; avatar_url?: string } };
};

export type BottomTabNavParamList = {
  Home: undefined;
  Courses: undefined;
  Notifications: undefined;
  Profile: undefined;
  Messages: undefined;
  Admin?: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  ResetPassword: undefined;
  NotFound: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ConfirmSignUp: undefined;
};
