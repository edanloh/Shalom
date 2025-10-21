import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Colors } from "../constants";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "accent" | "success" | "warning";
}

export const StatsCard = ({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "accent":
        return {
          card: { 
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.yellow}15 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.yellow}20`,
          },
          icon: { 
            color: Colors.yellow,
            backgroundColor: `${Colors.yellow}20`,
          }
        };
      case "success":
        return {
          card: { 
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.green}15 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.green}20`,
          },
          icon: { 
            color: Colors.green,
            backgroundColor: `${Colors.green}20`,
          }
        };
      case "warning":
        return {
          card: { 
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.yellow}15 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.yellow}20`,
          },
          icon: { 
            color: Colors.yellow,
            backgroundColor: `${Colors.yellow}20`,
          }
        };
      default:
        return {
          card: { 
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.purple400}15 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.purple400}20`,
          },
          icon: { 
            color: Colors.secondary,
            backgroundColor: `${Colors.secondary}20`,
          }
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card 
      className="p-6 border transition-all duration-300 hover:scale-105 hover:shadow-xl"
      style={{
        ...styles.card,
        backdropFilter: 'blur(8px)',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <p 
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: Colors.textSecondary }}
          >
            {title}
          </p>
          <p 
            className="text-3xl font-bold"
            style={{ color: Colors.textPrimary }}
          >
            {value}
          </p>
          {trend && (
            <p 
              className="text-xs"
              style={{ color: Colors.gray200 }}
            >
              {trend}
            </p>
          )}
        </div>
        <div 
          className="p-3 rounded-xl transition-all duration-300 hover:scale-110"
          style={{ 
            backgroundColor: styles.icon.backgroundColor,
            color: styles.icon.color,
            boxShadow: `0 4px 16px ${styles.icon.color}30`,
          }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};
