import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { user, isLoading: userLoading } = useUser();
  const location = useLocation();

  // Show loading state while checking authentication or user profile
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content if authenticated using Outlet
  return <Outlet />;
};

export default ProtectedRoute;
