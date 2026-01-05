import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  CourseDetail: { courseId: string };
  ModuleDetail: { courseId: string; sectionId: string; userId?: string };
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
  // SearchScreen: undefined;
  PointsHistory: undefined;
  // NotificationSettings: undefined;
  AchievementsScreen: undefined;
  CertificatesScreen: undefined;
};

export type TabParamList = {
  Home: undefined;
  Courses: undefined;
  Notifications: undefined;
  Profile: undefined;
  Admin?: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainScreens: NavigatorScreenParams<MainStackParamList>;
  NotFound: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ConfirmSignUp: { email?: string } | undefined;
};