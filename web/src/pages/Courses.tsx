import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Grid3x3, List, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Pagination } from "@/components/Pagination";
import courseThumbnail1 from "@/assets/course-thumbnail-1.jpg";
import courseThumbnail2 from "@/assets/course-thumbnail-2.jpg";
import courseThumbnail3 from "@/assets/course-thumbnail-3.jpg";
import courseThumbnail4 from "@/assets/course-thumbnail-4.jpg";

const Courses = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([
    {
      id: "1",
      title: "Data Science Fundamentals",
      category: "Data Science",
      thumbnail: courseThumbnail1,
      enrolledCount: 245,
      completionRate: 67,
      rating: 4.8,
      status: "published" as const,
    },
    {
      id: "2",
      title: "Machine Learning A-Z",
      category: "AI & ML",
      thumbnail: courseThumbnail2,
      enrolledCount: 189,
      completionRate: 54,
      rating: 4.9,
      status: "published" as const,
    },
    {
      id: "3",
      title: "Python for Beginners",
      category: "Programming",
      thumbnail: courseThumbnail3,
      enrolledCount: 412,
      completionRate: 78,
      rating: 4.7,
      status: "published" as const,
    },
    {
      id: "4",
      title: "Advanced Analytics",
      category: "Analytics",
      thumbnail: courseThumbnail4,
      enrolledCount: 156,
      completionRate: 45,
      rating: 4.6,
      status: "draft" as const,
    },
    {
      id: "5",
      title: "Data Science Fundamentals",
      category: "Data Science",
      thumbnail: courseThumbnail1,
      enrolledCount: 245,
      completionRate: 67,
      rating: 4.8,
      status: "published" as const,
    },
    {
      id: "6",
      title: "Machine Learning A-Z",
      category: "AI & ML",
      thumbnail: courseThumbnail2,
      enrolledCount: 189,
      completionRate: 54,
      rating: 4.9,
      status: "published" as const,
    },
    {
      id: "7",
      title: "Python for Beginners",
      category: "Programming",
      thumbnail: courseThumbnail3,
      enrolledCount: 412,
      completionRate: 78,
      rating: 4.7,
      status: "published" as const,
    },
    {
      id: "8",
      title: "Advanced Analytics",
      category: "Analytics",
      thumbnail: courseThumbnail4,
      enrolledCount: 156,
      completionRate: 45,
      rating: 4.6,
      status: "draft" as const,
    },
    {
      id: "9",
      title: "Data Science Fundamentals",
      category: "Data Science",
      thumbnail: courseThumbnail1,
      enrolledCount: 245,
      completionRate: 67,
      rating: 4.8,
      status: "published" as const,
    },
    {
      id: "10",
      title: "Machine Learning A-Z",
      category: "AI & ML",
      thumbnail: courseThumbnail2,
      enrolledCount: 189,
      completionRate: 54,
      rating: 4.9,
      status: "published" as const,
    },
    {
      id: "11",
      title: "Python for Beginners",
      category: "Programming",
      thumbnail: courseThumbnail3,
      enrolledCount: 412,
      completionRate: 78,
      rating: 4.7,
      status: "published" as const,
    },
    {
      id: "12",
      title: "Advanced Analytics",
      category: "Analytics",
      thumbnail: courseThumbnail4,
      enrolledCount: 156,
      completionRate: 45,
      rating: 4.6,
      status: "draft" as const,
    },
  ]);

  const handleCreateCourse = () => {
    if (!newCourseTitle || !newCourseCategory) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setCourses([
      ...courses,
      {
        id: Date.now().toString(),
        title: newCourseTitle,
        category: newCourseCategory,
        thumbnail: courseThumbnail1,
        enrolledCount: 0,
        completionRate: 0,
        rating: 0,
        status: "draft" as const,
      },
    ]);

    toast({
      title: "Course Created",
      description: `${newCourseTitle} has been created successfully`,
    });

    setIsCreateDialogOpen(false);
    setNewCourseTitle("");
    setNewCourseCategory("");
    setNewCourseDescription("");
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Add a new course to your curriculum
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="e.g., Introduction to React"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="e.g., Programming"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCourseDescription}
                    onChange={(e) => setNewCourseDescription(e.target.value)}
                    placeholder="Course description..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCourse}>Create Course</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

        {paginatedCourses.length > 0 ? (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {paginatedCourses.map((course, index) => (
                <CourseCard key={index} {...course} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredCourses.length / itemsPerPage)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCourses.length}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No courses found matching your criteria
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Courses;
