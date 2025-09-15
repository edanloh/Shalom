import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  CourseDetail: { courseId: string };
  Settings: undefined;
  EditProfile: undefined;
  MyCourses: undefined;
};

export type TabParamList = {
  Home: undefined;
  Courses: undefined;
  Notifications: undefined;
  Profile: undefined;
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