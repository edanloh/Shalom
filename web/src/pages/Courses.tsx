import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Grid3x3, List, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { courseService, Course } from "@/services";
import { useUser } from "@/contexts/UserContext";

const Courses = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useUser();

  // API state
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(null);
  
  // Refs for scrolling to sections
  const draftSectionRef = useRef<HTMLDivElement>(null);
  const publishedSectionRef = useRef<HTMLDivElement>(null);

  // Fetch courses from API
  useEffect(() => {
    fetchCourses();
  }, [user?.uuid]);

  const fetchCourses = async (newlyDuplicatedCourseId?: string) => {
    if (!user?.uuid) {
      setCourses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await courseService.getCourses({ instructorId: user.uuid });
      setCourses(data);
      
      // If we just duplicated a course, highlight it and scroll to it
      if (newlyDuplicatedCourseId) {
        setHighlightedCourseId(newlyDuplicatedCourseId);
        
        // Scroll to draft section after courses are loaded
        setTimeout(() => {
          draftSectionRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedCourseId(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on search and status
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Separate courses into published and draft
  const publishedCourses = filteredCourses.filter(course => course.status === 'published');
  const draftCourses = filteredCourses.filter(course => course.status === 'draft');

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Course Management
            </h1>
            <p className="text-muted-foreground">
              Manage and organize your courses
            </p>
          </div>

          <Button className="gap-2" onClick={() => navigate('/course-builder/new')}>
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </div>

        <div className="gradient-card border-border rounded-xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 flex-col">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <br />
            <p className="ml-4 text-lg">Loading courses...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchCourses()}>Retry</Button>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {statusFilter === 'all' && 'All Courses'}
                {statusFilter === 'published' && 'Published Courses'}
                {statusFilter === 'draft' && 'Draft Courses'}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
              </span>
            </div>
            
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className={`transition-all duration-500 ${
                    highlightedCourseId === course.id
                      ? 'ring-4 ring-primary ring-offset-4 ring-offset-background rounded-lg'
                      : ''
                  }`}
                >
                  <CourseCard 
                    {...course} 
                    onCourseUpdated={(duplicatedCourseId) => {
                      console.log('🔄 Course updated callback triggered:', duplicatedCourseId);
                      fetchCourses(duplicatedCourseId);
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No courses available
            </p>
            <Button className="mt-4" onClick={() => navigate('/course-builder/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Course
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Courses;
