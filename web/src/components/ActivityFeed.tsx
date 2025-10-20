import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserPlus, GraduationCap, MessageSquare, Award } from "lucide-react";
import { Colors } from "../constants";

interface Activity {
  id: string;
  type: "enrollment" | "completion" | "message" | "achievement";
  student: string;
  course: string;
  time: string;
}

export const ActivityFeed = () => {
  const activities: Activity[] = [
    {
      id: "1",
      type: "enrollment",
      student: "Sarah Chen",
      course: "Data Science Fundamentals",
      time: "2 minutes ago",
    },
    {
      id: "2",
      type: "completion",
      student: "Mike Johnson",
      course: "Machine Learning Basics",
      time: "15 minutes ago",
    },
    {
      id: "3",
      type: "message",
      student: "Emma Wilson",
      course: "Python Programming",
      time: "1 hour ago",
    },
    {
      id: "4",
      type: "achievement",
      student: "Alex Rodriguez",
      course: "Advanced Analytics",
      time: "2 hours ago",
    },
  ];

  const getIcon = (type: Activity["type"]) => {
    const icons = {
      enrollment: UserPlus,
      completion: GraduationCap,
      message: MessageSquare,
      achievement: Award,
    };
    return icons[type];
  };

  const getIconStyles = (type: Activity["type"]) => {
    switch (type) {
      case "enrollment":
        return {
          backgroundColor: `${Colors.secondary}20`,
          color: Colors.secondary,
        };
      case "completion":
        return { backgroundColor: `${Colors.green}20`, color: Colors.green };
      case "message":
        return {
          backgroundColor: `${Colors.purple400}20`,
          color: Colors.purple400,
        };
      case "achievement":
        return { backgroundColor: `${Colors.yellow}20`, color: Colors.yellow };
      default:
        return {
          backgroundColor: `${Colors.surface}50`,
          color: Colors.textPrimary,
        };
    }
  };

  return (
    <Card
      className="border transition-all duration-300 hover:shadow-xl"
      style={{
        background: Colors.backgroundGray,
        // background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.purple400}10 100%)`,
        borderColor: Colors.cardBorder,
        boxShadow: `0 8px 32px ${Colors.primary}20`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="p-6">
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: Colors.textPrimary }}
        >
          Recent Activity
        </h3>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type);
              const iconStyles = getIconStyles(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex gap-4 p-4 rounded-lg transition-all duration-300 hover:shadow-md border border-border/50 relative overflow-hidden bg-card"
                >
                  <div
                    className="relative p-2 flex justify-center items-center rounded-lg w-10 h-10 transition-all duration-300 hover:scale-110"
                    style={{
                      ...iconStyles,
                      boxShadow: `0 4px 12px ${iconStyles.color}30`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="relative flex-1 space-y-1">
                    <div className="flex justify-between items-center space-y-0">
                      <p
                        className="text-sm font-medium"
                        style={{ color: Colors.textPrimary }}
                      >
                        {activity.student}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: Colors.textMuted2 }}
                      >
                        {activity.time}
                      </p>
                    </div>

                    <p className="text-xs" style={{ color: Colors.textSecondary }}>
                      {activity.type === "enrollment" && "Enrolled in "}
                      {activity.type === "completion" && "Completed "}
                      {activity.type === "message" && "Sent message in "}
                      {activity.type === "achievement" &&
                        "Earned certificate in "}
                      {activity.course}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};
