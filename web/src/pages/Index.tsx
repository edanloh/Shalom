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
  ArrowRight
} from "lucide-react";

import courseThumbnail1 from "@/assets/course-thumbnail-1.jpg";
import courseThumbnail2 from "@/assets/course-thumbnail-2.jpg";
import courseThumbnail3 from "@/assets/course-thumbnail-3.jpg";
import courseThumbnail4 from "@/assets/course-thumbnail-4.jpg";

const Index = () => {
  const navigate = useNavigate();
  
      const courses = [
        {
          id: "1",
          title: "Data Science Fundamentals",
          category: "Data Science",
          thumbnail: courseThumbnail1,
          enrolledCount: 245,
          completionRate: 67,
          rating: 4.8,
          status: "published" as const
        },
        {
          id: "2",
          title: "Machine Learning A-Z",
          category: "AI & ML",
          thumbnail: courseThumbnail2,
          enrolledCount: 189,
          completionRate: 54,
          rating: 4.9,
          status: "published" as const
        },
        {
          id: "3",
          title: "Python for Beginners",
          category: "Programming",
          thumbnail: courseThumbnail3,
          enrolledCount: 412,
          completionRate: 78,
          rating: 4.7,
          status: "published" as const
        },
        {
          id: "4",
          title: "Advanced Analytics",
          category: "Analytics",
          thumbnail: courseThumbnail4,
          enrolledCount: 156,
          completionRate: 45,
          rating: 4.6,
          status: "draft" as const
        }
      ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome Back, <span className="bg-gradient-primary bg-clip-text text-transparent">Dr. Rachel</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your courses today
          </p>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Students"
            value="1,002"
            icon={Users}
            trend="+12% from last month"
            variant="default"
          />
          <StatsCard
            title="Avg Completion"
            value="64%"
            icon={TrendingUp}
            trend="+5% improvement"
            variant="success"
          />
          <StatsCard
            title="Course Rating"
            value="4.8"
            icon={Star}
            trend="Across all courses"
            variant="warning"
          />
          <StatsCard
            title="Revenue"
            value="$24,580"
            icon={DollarSign}
            trend="+18% this month"
            variant="accent"
          />
        </section>

        {/* Quick Actions */}
        <QuickActions />

        {/* Active Courses Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Active Courses</h2>
              <p className="text-muted-foreground">Manage and monitor your course performance</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/courses")}>
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
            <ActivityFeed />
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
                  <p className="text-sm font-medium text-foreground">Live Q&A Session</p>
                  <p className="text-xs text-muted-foreground">Today, 3:00 PM</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-sm font-medium text-foreground">Workshop: Data Visualization</p>
                  <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
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
                  <span className="text-sm text-foreground">Assignments to Grade</span>
                  <span className="font-bold text-accent">28</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <span className="text-sm text-foreground">Unread Messages</span>
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
