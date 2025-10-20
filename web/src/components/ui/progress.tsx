import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
import { Colors } from "@/constants/Colors";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { completionRate?: number }
>(({ className, value = 0, completionRate = 0, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "h-2 w-full rounded-full overflow-hidden",
      className
    )}
    {...props}
  >
    {/* Unfilled background */}
    <div
      className="h-full w-full"
      style={{ backgroundColor: Colors.gray200 }}
    >
      {/* Filled portion */}
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${completionRate || value}%`,
          background: `linear-gradient(90deg, ${Colors.purple400} 0%, ${Colors.purple600} 100%)`,
          boxShadow: `0 2px 8px ${Colors.purple400}40`,
        }}
      />
    </div>
  </ProgressPrimitive.Root>
));

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
