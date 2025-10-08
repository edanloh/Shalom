import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, MessageSquare, ClipboardCheck, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Colors } from "../constants";

export const QuickActions = () => {
  const navigate = useNavigate();
  
  const actions = [
    { icon: Plus, label: "Create Course", variant: "default" as const, path: "/courses" },
    { icon: MessageSquare, label: "Messages", variant: "outline" as const, path: "/messages" },
    { icon: ClipboardCheck, label: "Grade", variant: "outline" as const, path: "/assessments" },
    { icon: BarChart3, label: "Analytics", variant: "outline" as const, path: "/analytics" },
  ];

  return (
    <Card 
      className="p-6 border transition-all duration-300 hover:shadow-xl"
      style={{ 
        background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.purple400}10 100%)`,
        borderColor: Colors.cardBorder,
        boxShadow: `0 8px 32px ${Colors.primary}20`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <h3 
        className="text-lg font-semibold mb-4"
        style={{ color: Colors.textPrimary }}
      >
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="flex flex-col gap-2 h-auto py-4 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            onClick={() => navigate(action.path)}
            style={{
              background: action.variant === "default" 
                ? `linear-gradient(135deg, ${Colors.secondary} 0%, ${Colors.purple600} 100%)`
                : `${Colors.surface}80`,
              border: `1px solid ${Colors.cardBorder}`,
              color: action.variant === "default" ? Colors.white : Colors.textPrimary,
              boxShadow: action.variant === "default" 
                ? `0 4px 16px ${Colors.secondary}40` 
                : `0 2px 8px ${Colors.primary}20`,
            }}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
