import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabNavParamList>;
  CourseDetail: { courseId: string };
  ModuleDetail: {
    courseId: string;
    sectionId: string;
    userId?: string;
    videoCompleted?: boolean;
    quizCompleted?: boolean;
    pdfCompleted?: boolean;
    completedVideoId?: string;
    completedQuizId?: string;
    completedPdfId?: string;
    timestamp?: number;
  };
  LessonPlayer: { videoId: string; courseId: string; sectionId?: string; userId?: string };
  QuizScreen: { quizId: string; courseId: string; sectionId?: string; userId?: string };
  PDFView: { pdfId: string; courseId: string; sectionId?: string; userId?: string;};
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
  ChangePassword: undefined;
  ResetPassword: undefined;
};

export type BottomTabNavParamList = {
  Home: undefined;
  Courses: undefined;
  Notifications: undefined;
  Profile: undefined;
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
