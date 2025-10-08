import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Star, BarChart3, MoreVertical, Edit, Copy, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Colors } from "../constants";

interface CourseCardProps {
  id?: string;
  title: string;
  category: string;
  thumbnail: string;
  enrolledCount: number;
  completionRate: number;
  rating: number;
  status: "published" | "draft" | "archived";
}

export const CourseCard = ({
  id = "1",
  title,
  category,
  thumbnail,
  enrolledCount,
  completionRate,
  rating,
  status
}: CourseCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const statusColors = {
    published: "status-badge-published",
    draft: "status-badge-draft",
    archived: "bg-muted text-muted-foreground"
  };

  const handleEdit = () => {
    navigate(`/course-builder/${id}`);
  };

  const handleViewAnalytics = () => {
    navigate("/analytics");
  };

  const handleDuplicate = () => {
    toast({ title: "Course Duplicated", description: `${title} has been duplicated` });
  };

  const handleArchive = () => {
    toast({ title: "Course Archived", description: `${title} has been archived` });
  };

  const handleCardClick = () => {
    navigate(`/course/${id}`);
  };

  return (
    <Card className="overflow-hidden hover-lift border-border group cursor-pointer" onClick={handleCardClick}>
      <div className="relative h-48 overflow-hidden">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewAnalytics(); }}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(); }}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="p-6 space-y-4">
        <div>
          <Badge variant="secondary" className="mb-2 text-xs">
            {category}
          </Badge>
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">
            {title}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Course Progress</span>
            <span className="font-medium text-foreground">{completionRate}%</span>
          </div>
          <div 
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: Colors.gray200 }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${completionRate}%`,
                background: `linear-gradient(90deg, ${Colors.purple400} 0%, ${Colors.purple600} 100%)`,
                boxShadow: `0 2px 8px ${Colors.purple400}40`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{enrolledCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <span className="text-sm font-medium text-foreground">{rating}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-foreground">{completionRate}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
            Edit
          </Button>
          <Button variant="default" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleViewAnalytics(); }}>
            Analytics
          </Button>
        </div>
      </div>
    </Card>
  );
};
