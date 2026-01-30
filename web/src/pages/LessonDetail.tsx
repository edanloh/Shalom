import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Video, FileText, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { lessonService } from "@/services";
import { useUser } from "@/contexts/UserContext";

// Helper function to detect video type and convert to embeddable URL
const getVideoEmbedInfo = (url: string) => {
  if (!url) return { type: 'none', embedUrl: null };

  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
    };
  }

  // Vimeo patterns
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`
    };
  }

  // Direct video file (mp4, webm, ogg)
  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return {
      type: 'direct',
      embedUrl: url
    };
  }

  // Default: try as iframe embed
  return {
    type: 'iframe',
    embedUrl: url
  };
};

const LessonDetail = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [currentSection, setCurrentSection] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    if (courseId && lessonId) {
      // Reset state when lesson changes to ensure clean transitions
      setLesson(null);
      setError(null);
      fetchLessonData();
    }
  }, [courseId, lessonId]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Get actual userId from auth context
      const userId = user.uuid;

      // Call lesson service to get lesson details
      const lessonData = await lessonService.getLessonDetail(lessonId!, userId);
      
      // Set lesson data from API response - handle both video and PDF types
      setLesson({
        id: lessonData.id,
        title: lessonData.title,
        description: lessonData.description || '',
        type: lessonData.type || 'video', // 'video' or 'pdf'
        video_url: lessonData.video_url,
        videoUrl: lessonData.video_url, // Also set camelCase for compatibility
        resource_url: lessonData.resource_url, // For PDF lessons
        resourceUrl: lessonData.resource_url,
        is_downloadable: lessonData.is_downloadable,
        file_size_bytes: lessonData.file_size_bytes,
        duration: lessonData.duration_seconds,
        thumbnail: lessonData.thumbnail_url,
        order: lessonData.order_index,
      });

      // Set course data
      setCourse({
        id: lessonData.course?.id,
        title: lessonData.course?.title,
        instructor_name: lessonData.course?.instructor_name,
        level: lessonData.course?.level,
      });

      // Set current section
      setCurrentSection({
        id: lessonData.section?.id,
        title: lessonData.section?.title,
      });

      // Set all videos for navigation (from sectionVideos) - include all types
      // Backend already returns items sorted by order_index, so use as-is
      if (lessonData.sectionVideos) {
        setAllVideos(lessonData.sectionVideos.map((v: any) => ({
          id: v.id,
          title: v.title,
          order: v.order_index,
          type: v.type || 'video',
        })));
      }
      
      // Set user progress
      setProgress(lessonData.userProgress?.progress_percentage || 0);
    } catch (err) {
      console.error('Error fetching lesson data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lesson data');
      toast({
        title: "Error",
        description: "Failed to load lesson details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    setProgress(100);
    toast({
      title: "Lesson Completed!",
      description: "Great job! Moving to the next item.",
    });
    
    // Find next item in the section (including quizzes)
    const currentIndex = allVideos.findIndex(v => v.id === lessonId);
    if (currentIndex >= 0 && currentIndex < allVideos.length - 1) {
      const nextItem = allVideos[currentIndex + 1];
      const nextItemId = nextItem.id;
      
      // Navigate to quiz or lesson based on type
      if (nextItem.type === 'quiz') {
        navigate(`/course/${courseId}/module/${moduleId || currentSection?.id}/quiz/${nextItemId}`);
      } else {
        navigate(`/course/${courseId}/module/${moduleId || currentSection?.id}/lesson/${nextItemId}`);
      }
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  const handlePrevious = () => {
    const currentIndex = allVideos.findIndex(v => v.id === lessonId);
    if (currentIndex > 0) {
      const prevItem = allVideos[currentIndex - 1];
      const prevItemId = prevItem.id;
      
      // Navigate to quiz or lesson based on type
      if (prevItem.type === 'quiz') {
        navigate(`/course/${courseId}/module/${moduleId || currentSection?.id}/quiz/${prevItemId}`);
      } else {
        navigate(`/course/${courseId}/module/${moduleId || currentSection?.id}/lesson/${prevItemId}`);
      }
    }
  };

  const handleNext = () => {
    const currentIndex = allVideos.findIndex(v => v.id === lessonId);
    if (currentIndex < allVideos.length - 1) {
      const nextItem = allVideos[currentIndex + 1];
      const nextItemId = nextItem.id;
      
      // Navigate to quiz or lesson based on type
      if (nextItem.type === 'quiz') {
        navigate(`/course/${courseId}/module/${moduleId || currentSection?.id}/quiz/${nextItemId}`);
      } else {
        navigate(`/course/${courseId}/module/${moduleId || currentSection?.id}/lesson/${nextItemId}`);
      }
    } else {
      navigate(`/course/${courseId}`);
    }
  };

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

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Lesson Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'The lesson you are looking for does not exist.'}</p>
            <Button onClick={() => navigate(`/course/${courseId}`)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const currentIndex = allVideos.findIndex(v => v.id === lessonId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allVideos.length - 1;
  
  // Get next item info for button label
  const nextItem = hasNext ? allVideos[currentIndex + 1] : null;
  const nextItemLabel = nextItem?.type === 'quiz' ? 'Next Quiz' : 
                       nextItem?.type === 'pdf' ? 'Next PDF' : 
                       'Next Lesson';
  
  // Get previous item info for button label
  const prevItem = hasPrevious ? allVideos[currentIndex - 1] : null;
  const prevItemLabel = prevItem?.type === 'quiz' ? 'Previous Quiz' : 
                       prevItem?.type === 'pdf' ? 'Previous PDF' : 
                       'Previous Lesson';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[32px] font-bold">{lesson.title}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                {lesson.type === 'pdf' ? (
                  <>
                    <FileText className="h-4 w-4" />
                    {lesson.file_size_bytes 
                      ? `${(lesson.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                      : 'PDF Document'
                    }
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    {lesson.duration ? `${Math.floor(lesson.duration / 60)} minutes` : 'N/A'}
                  </>
                )}
              </p>
              {currentSection && (
                <p className="text-sm text-muted-foreground">
                  Section: {currentSection.title}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Video Player or PDF Viewer */}
            <div className="gradient-card border border-border rounded-xl overflow-hidden">
              <div className="aspect-video bg-card">
                {lesson.type === 'pdf' ? (
                  // PDF Viewer
                  lesson.resource_url ? (
                    <iframe
                      src={lesson.resource_url}
                      title={lesson.title}
                      className="w-full h-full"
                      style={{ minHeight: '600px' }}
                      frameBorder="0"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No PDF available for this lesson</p>
                      </div>
                    </div>
                  )
                ) : (
                  // Video Player
                  (() => {
                    const videoInfo = getVideoEmbedInfo(lesson.video_url);
                    
                    if (videoInfo.type === 'none' || !videoInfo.embedUrl) {
                      return (
                        <div className="flex items-center justify-center h-full bg-muted">
                          <div className="text-center">
                            <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">No video available for this lesson</p>
                          </div>
                        </div>
                      );
                    }

                    if (videoInfo.type === 'direct') {
                      return (
                        <video
                          controls
                          className="w-full h-full"
                          poster={lesson.thumbnail_url}
                        >
                          <source src={videoInfo.embedUrl} type="video/mp4" />
                          <source src={videoInfo.embedUrl} type="video/webm" />
                          <source src={videoInfo.embedUrl} type="video/ogg" />
                          Your browser does not support the video tag.
                        </video>
                      );
                    }

                    // YouTube, Vimeo, or generic iframe
                    return (
                      <iframe
                        width="100%"
                        height="100%"
                        src={videoInfo.embedUrl}
                        title={lesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="w-full h-full"
                        frameBorder="0"
                      ></iframe>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Lesson Content */}
            <div className="gradient-card border border-border rounded-xl p-6">
              <Tabs defaultValue="content">
                <TabsList className="mb-6">
                  <TabsTrigger value="content">
                    <FileText className="h-4 w-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="transcript">
                    <Video className="h-4 w-4 mr-2" />
                    Transcript
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content">
                  {lesson.description ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">About this lesson</h3>
                      <p className="text-foreground">{lesson.description}</p>
                      
                      {lesson.type === 'pdf' && lesson.is_downloadable && lesson.resource_url && (
                        <div className="mt-4">
                          <Button
                            onClick={() => window.open(lesson.resource_url, '_blank')}
                            variant="outline"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      )}
                      
                      {course && course.outcomes && course.outcomes.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Learning Objectives</h3>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {course.outcomes.map((outcome: string, index: number) => (
                              <li key={index}>{outcome}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No content description available for this lesson.</p>
                  )}
                </TabsContent>

                <TabsContent value="transcript">
                  <p className="text-muted-foreground">Video transcript is not available yet.</p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={!hasPrevious}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {prevItemLabel}
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!hasNext}
              >
                {hasNext ? nextItemLabel : 'Back to Course'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="gradient-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Course Info</h3>
              <div className="space-y-3">
                {course && (
                  <>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Course</p>
                      <p className="font-medium">{course.title}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Instructor</p>
                      <p className="font-medium">{course.instructor_name}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Level</p>
                      <p className="font-medium capitalize">{course.level}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonDetail;
