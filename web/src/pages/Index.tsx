import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { QuickActions } from "@/components/QuickActions";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Star,
  DollarSign,
  BookOpen,
  Clock,
  ArrowRight,
  UserPlus,
  Loader2,
} from "lucide-react";
import { courseService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for API data
  const [courses, setCourses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get admin ID from user (fallback to mock for now)
      const adminId = user?.id || '550e8400-e29b-41d4-a716-446655440201';

      // Fetch courses and admin stats in parallel using courseService
      const [coursesData, statsData] = await Promise.all([
        courseService.getCourses({ sortBy: 'updated_at', sortOrder: 'desc' }),
        courseService.getInstructorStats(adminId)
      ]);

      setCourses(coursesData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome Back,{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {user?.name || "Instructor"}
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your courses today
          </p>
        </section>

        {/* Stats Grid */}
        {stats && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Students"
              value={stats.statistics.total_students.toLocaleString()}
              icon={Users}
              trend={`${stats.statistics.active_students} active`}
              variant="default"
            />
            <StatsCard
              title="Avg Completion"
              value={`${stats.statistics.average_completion_rate}%`}
              icon={TrendingUp}
              trend={`${stats.statistics.completed_courses} completed`}
              variant="success"
            />
            <StatsCard
              title="Course Rating"
              value={stats.statistics.average_rating}
              icon={Star}
              trend="Across all courses"
              variant="warning"
            />
            <StatsCard
              title="New Enrollments"
              value={stats.statistics.new_enrollments_this_month.toString()}
              icon={UserPlus}
              trend="This month"
              variant="accent"
            />
          </section>
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Active Courses Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Active Courses
              </h2>
              <p className="text-muted-foreground">
                Manage and monitor your course performance
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/courses")}
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course, index) => (
              <CourseCard key={index} {...course} />
            ))}
          </div>
        </section>

        {/* Bottom Grid - Activity & Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {stats && stats.recent_activity && stats.recent_activity.length > 0 ? (
              <div className="gradient-card border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  Recent Activity
                </h3>
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {stats.recent_activity.slice(0, 8).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.student_name} enrolled in {activity.course_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.formatted_date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ActivityFeed />
            )}
          </div>

          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <div className="gradient-card border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming Sessions
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium text-foreground">
                    Live Q&A Session
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Today, 3:00 PM
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium text-foreground">
                    Workshop: Data Visualization
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tomorrow, 10:00 AM
                  </p>
                </div>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="gradient-card border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Pending Tasks
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <span className="text-sm text-foreground">
                    Assignments to Grade
                  </span>
                  <span className="font-bold text-accent">28</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <span className="text-sm text-foreground">
                    Unread Messages
                  </span>
                  <span className="font-bold text-primary">12</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
