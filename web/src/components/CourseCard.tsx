import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_COURSE_THUMBNAIL } from "@/constants/images";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Star,
  BookOpen,
  MoreVertical,
  Edit,
  Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { courseService } from "@/services/courseService";

interface CourseCardProps {
  id?: string;
  title: string;
  category: string;
  categoryColor: string;
  thumbnail: string;
  enrolledCount: number;
  rating: number;
  totalRatings: number;
  modules: number;  // This is what courseService returns (from total_sections)
  lessons: number;  // This is what courseService returns (from total_videos)
  status: "published" | "draft" | "archived";
  onCourseUpdated?: (duplicatedCourseId?: string) => void;
}

export const CourseCard = ({
  id = "1",
  title,
  category,
  categoryColor,
  thumbnail,
  enrolledCount,
  rating,
  totalRatings,
  modules,  // Receives modules count
  lessons,  // Receives lessons count
  status,
  onCourseUpdated,
}: CourseCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const statusColors = {
    published: "status-badge-published",
    draft: "status-badge-draft",
    archived: "bg-muted text-muted-foreground",
  };

  const handleEdit = () => {
    navigate(`/course-builder/${id}`);
  };

  const handleViewAnalytics = () => {
    navigate("/analytics");
  };

  const handleDuplicate = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const duplicatedCourse = await courseService.duplicateCourse(id);
      
      toast({
        title: "Course Duplicated",
        description: `"${title}" has been duplicated successfully as "${duplicatedCourse.title}"`,
        variant: "default",
      });
      
      // Notify parent component to refresh the course list and pass the duplicated course ID
      if (onCourseUpdated) {
        onCourseUpdated(duplicatedCourse.id);
      }
      
      // Optional: Navigate to edit the duplicated course
      // navigate(`/course-builder/${duplicatedCourse.id}`);
    } catch (error) {
      console.error('Error duplicating course:', error);
      toast({
        title: "Duplication Failed",
        description: error instanceof Error ? error.message : "Failed to duplicate course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/course/${id}`);
  };

  return (
    <Card
      className="overflow-hidden hover-lift border-border group cursor-pointer flex flex-col h-full"
      onClick={handleCardClick}
    >
      <div className="relative h-48 bg-muted overflow-hidden flex-shrink-0">
        <img
          src={thumbnail || DEFAULT_COURSE_THUMBNAIL}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = DEFAULT_COURSE_THUMBNAIL;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <Badge className={`absolute top-4 left-4 ${statusColors[status]}`}>
          {status.toUpperCase()}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm hover:bg-background/80"
              disabled={isLoading}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              disabled={isLoading}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate();
              }}
              disabled={isLoading}
            >
              <Copy className="h-4 w-4 mr-2" />
              {isLoading ? "Duplicating..." : "Duplicate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-6 space-y-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <Badge variant="secondary" className="mb-2 text-xs" style={{backgroundColor: categoryColor}}>
            {category} 
          </Badge>
          <h3 className="text-lg font-semibold text-foreground line-clamp-2 min-h-[3.5rem]">
            {title}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="flex flex-col items-center gap-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {enrolledCount || 0}
            </span>
            <span className="text-xs text-muted-foreground">Students</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <span className="text-sm font-medium text-foreground">
              {totalRatings > 0 ? `${rating.toFixed(1)} (${totalRatings})` : '-'}
            </span>
            <span className="text-xs text-muted-foreground">
              {totalRatings > 0 ? "Ratings" : 'No ratings'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <BookOpen className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-foreground">
              {modules || 0}
            </span>
            <span className="text-xs text-muted-foreground">Modules</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            disabled={isLoading}
          >
            Edit
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleViewAnalytics();
            }}
            disabled={isLoading}
          >
            Analytics
          </Button>
        </div>
      </div>
    </Card>
  );
};