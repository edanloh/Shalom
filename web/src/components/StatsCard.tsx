import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Colors } from "../constants";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: 
    | "default" 
    | "accent" 
    | "success" 
    | "warning" 
    | "secondary" 
    | "streakFire";
  className?: string;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  className = "",
}: StatsCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "accent":
        return {
          card: {
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.yellow}20 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.yellow}30`,
          },
          icon: {
            color: Colors.yellow,
            backgroundColor: `${Colors.yellow}20`,
          },
        };
      case "success":
        return {
          card: {
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.green}20 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.green}30`,
          },
          icon: {
            color: Colors.green,
            backgroundColor: `${Colors.green}20`,
          },
        };
      case "warning":
        return {
          card: {
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.red}20 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.red}30`,
          },
          icon: {
            color: Colors.red,
            backgroundColor: `${Colors.red}20`,
          },
        };
      case "secondary":
        return {
          card: {
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.purple300}20 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.purple300}30`,
          },
          icon: {
            color: Colors.purple600,
            backgroundColor: `${Colors.purple300}20`,
          },
        };
      case "streakFire":
        return {
          card: {
            background: `linear-gradient(135deg, ${Colors.streakFire} 0%, ${Colors.red}20 100%)`,
            borderColor: Colors.streakFire,
            boxShadow: `0 8px 32px ${Colors.streakFire}30`,
          },
          icon: {
            color: Colors.white,
            backgroundColor: `${Colors.streakFire}30`,
          },
        };
      default:
        return {
          card: {
            background: `linear-gradient(135deg, ${Colors.surface} 0%, ${Colors.secondary}20 100%)`,
            borderColor: Colors.cardBorder,
            boxShadow: `0 8px 32px ${Colors.secondary}30`,
          },
          icon: {
            color: Colors.purple200,
            backgroundColor: `${Colors.secondary}20`,
          },
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card
      className={`p-6 border transition-all duration-300 hover:scale-105 hover:shadow-xl ${className}`}
      style={{
        ...styles.card,
        backdropFilter: "blur(8px)",
        borderWidth: "1px",
        borderStyle: "solid",
        width: "100%", // ensures all cards stretch equally
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
            <p className="text-xs" style={{ color: Colors.textMuted2 }}>
              {trend}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
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
