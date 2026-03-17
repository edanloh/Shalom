import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Users, ClipboardCheck, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();
  
  const actions = [
    { icon: Plus, label: "Create Course", variant: "default" as const, path: "/course-builder/new" },
    { icon: Users, label: "Students", variant: "outline" as const, path: "/students" },
    { icon: ClipboardCheck, label: "Grade", variant: "outline" as const, path: "/quiz" },
    { icon: Award, label: "Badges", variant: "outline" as const, path: "/badges" },
  ];

  return (
    <Card className="p-6 gradient-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="flex flex-col gap-2 h-auto py-4"
            onClick={() => navigate(action.path)}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
