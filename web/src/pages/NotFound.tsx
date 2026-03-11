import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (isLoading) return;

    const redirectTo = isAuthenticated ? "/" : "/login";
    const timeoutId = window.setTimeout(() => {
      navigate(redirectTo, { replace: true });
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--primary),0.2),transparent_45%)]" />

      <Card className="relative w-full max-w-xl border-border/60 bg-card/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="space-y-5 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Error 404
            </p>
            <CardTitle className="text-3xl font-bold text-foreground">
              Oops! Page not found
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-3 pb-8">
          <Button asChild className="min-w-48">
            <Link to="/">
              Return to Home
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">Taking you back automatically...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
