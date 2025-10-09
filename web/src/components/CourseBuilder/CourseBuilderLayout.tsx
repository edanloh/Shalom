import React from "react";
import { useCourseBuilder } from './CourseBuilderContext';

export const CourseBuilderLayout = ({ children }: { children: React.ReactNode }) => {
  const {
    toast,
    sidebarWidth,
    rightSidebarWidth,
    isResizing,
    setIsResizing,
    setSidebarWidth,
    setRightSidebarWidth,
  } = useCourseBuilder();

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    if (isResizing === "left") {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 15 && newWidth <= 50) {
        setSidebarWidth(newWidth);
      }
    } else if (isResizing === "right") {
      const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      if (newWidth >= 15 && newWidth <= 50) {
        setRightSidebarWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  // Add global event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Add CSS for smooth drag animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .dragging * {
            cursor: grabbing !important;
          }
          
          .drag-item {
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform-origin: center;
          }
          
          .drag-item.dragging {
            transform: scale(1.05) rotate(2deg);
            opacity: 0.7;
            z-index: 1000;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          }
          
          .drag-item.drag-over {
            transform: scale(1.02);
            box-shadow: 0 0 0 2px #3b82f6, 0 10px 20px rgba(59, 130, 246, 0.2);
          }
          
          .drag-placeholder {
            transition: all 0.3s ease;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
            border: 2px dashed #3b82f6;
            border-radius: 8px;
          }
          
          .drag-ghost {
            opacity: 0.3;
            transform: scale(0.95);
          }
          
          @keyframes dragPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          
          .drag-target {
            animation: dragPulse 1.5s infinite;
          }
        `
      }} />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-medium animate-pulse z-50 ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {children}
    </div>
  );
};