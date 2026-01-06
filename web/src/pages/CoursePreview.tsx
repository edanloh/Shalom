import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Star, Clock, BookOpen, Users, Award, Play, Loader2 } from "lucide-react";
import { DEFAULT_COURSE_THUMBNAIL } from "@/constants/images";
import { courseService, type Course } from "@/services/courseService";

const CoursePreview = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        setError("No course ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const courseData = await courseService.getCourseById(courseId);
        
        if (!courseData) {
          setError("Course not found");
        } else {
          setCourse(courseData);
        }
      } catch (err) {
        console.error("Error fetching course:", err);
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/course-builder/${courseId}`)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <div className="gradient-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
            <p className="text-muted-foreground">{error || "The course could not be loaded."}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/course-builder/${courseId}`)}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Editor
        </Button>

        <div className="gradient-card border border-border rounded-xl overflow-hidden mb-6">
          <div className="relative">
            <img 
              src={course.thumbnail || DEFAULT_COURSE_THUMBNAIL} 
              alt={course.title}
              className="w-full h-80 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = DEFAULT_COURSE_THUMBNAIL;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <Badge className="mb-2">{course.category}</Badge>
              <h1 className="text-[32px] font-bold mb-2">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{course.description}</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning fill-warning" />
                  <span className="font-semibold">{course.rating}</span>
                  <span className="text-muted-foreground">({course.totalRatings} ratings)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>{course.lessons} lessons</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="gradient-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Course Content</h2>
              <div className="space-y-3">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Course Overview</div>
                        <div className="text-sm text-muted-foreground">
                          {course.modules} modules • {course.lessons} lessons • {course.quizzes} quizzes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground p-4">
                  Detailed course modules will be available once you publish the course.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">About the Instructor</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-xl font-bold">SJ</span>
                </div>
                <div>
                  <div className="font-semibold">{course.instructor}</div>
                  <div className="text-sm text-muted-foreground">Data Science Expert</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                PhD in Computer Science with 10+ years of industry experience in data science and machine learning.
              </p>
            </div>

            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">What You'll Learn</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-success mt-0.5" />
                  <span>Master data science fundamentals</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-success mt-0.5" />
                  <span>Learn Python and key libraries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-success mt-0.5" />
                  <span>Build real-world projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 text-success mt-0.5" />
                  <span>Understand ML algorithms</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoursePreview;
