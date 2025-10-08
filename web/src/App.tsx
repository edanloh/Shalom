import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import Analytics from "./pages/Analytics";
import Students from "./pages/Students";
import Assessments from "./pages/Assessments";
// import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CourseBuilder from "./pages/CourseBuilder";
import CourseDetail from "./pages/CourseDetail";
import BadgeManagement from "./pages/BadgeManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/students" element={<Students />} />
          <Route path="/assessments" element={<Assessments />} />
          {/* <Route path="/messages" element={<Messages />} /> */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/course-builder/:courseId" element={<CourseBuilder />} />
          <Route path="/course/:courseId" element={<CourseDetail />} />
          <Route path="/badges" element={<BadgeManagement />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
