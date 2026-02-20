import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import Analytics from "./pages/Analytics";
import Students from "./pages/Students";
import CourseStudents from "./pages/CourseStudents";
import Assessments from "./pages/Assessments";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CourseBuilder from "./pages/CourseBuilder";
import CourseDetail from "./pages/CourseDetail";
import BadgeManagement from "./pages/BadgeManagement";
import Notifications from "./pages/Notification";
import LessonDetail from "./pages/LessonDetail";
import QuizTaking from "./pages/QuizTaking";
import { UserProvider } from "./contexts/UserContext";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <UserProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes - all nested under ProtectedRoute */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/students" element={<Students />} />
                <Route path="/course/:courseId/students" element={<CourseStudents />} />
                <Route path="/assessments" element={<Assessments />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/course-builder/:courseId"
                  element={<CourseBuilder />}
                />
                <Route path="/course/:courseId" element={<CourseDetail />} />
                <Route
                  path="/course/:courseId/module/:moduleId/lesson/:lessonId"
                  element={<LessonDetail />}
                />
                <Route
                  path="/course/:courseId/module/:moduleId/quiz/:quizId"
                  element={<QuizTaking />}
                />
                <Route path="/badges" element={<BadgeManagement />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </UserProvider>
  </AuthProvider>
);

export default App;
