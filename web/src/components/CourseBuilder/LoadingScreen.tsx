import { Loader2 } from "lucide-react";
import { Colors } from "../../constants/Colors";

export const LoadingScreen = () => {
  return (
    <div
      style={{
        backgroundColor: Colors.primary,
        minHeight: "100vh",
      }}
      className="flex items-center justify-center"
    >
      <div className="text-center space-y-4">
        <Loader2
          className="h-16 w-16 animate-spin mx-auto"
          style={{ color: Colors.secondary }}
        />
        <div>
          <h2
            style={{ color: Colors.textPrimary }}
            className="text-2xl font-semibold mb-2"
          >
            Loading Course...
          </h2>
          <p style={{ color: Colors.textMuted }} className="text-sm">
            Please wait while we fetch your course content
          </p>
        </div>
      </div>
    </div>
  );
};
