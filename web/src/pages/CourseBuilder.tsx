import React, { useEffect } from "react";
import { useParams, useNavigate, useBeforeUnload } from "react-router-dom";
import {
  CourseBuilderProvider,
  useCourseBuilder,
  CourseBuilderLayout,
  CourseBuilderHeader,
  LeftSidebar,
  RightSidebar,
  CoursePreview,
  CenterContent,
  LoadingScreen,
  ConfirmationModal,
} from "../components/CourseBuilder";

const CourseBuilder = () => {
  const { courseId } = useParams<{ courseId: string }>();
  
  return (
    <CourseBuilderProvider courseId={courseId}>
      <CourseBuilderMain />
    </CourseBuilderProvider>
  );
};

const CourseBuilderMain = () => {
  const { previewMode, isLoadingCourse, hasUnsavedChanges, modalState, closeModal } = useCourseBuilder();
  const navigate = useNavigate();

  // Warn user about unsaved changes before leaving page
  useBeforeUnload(
    React.useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return (event.returnValue = "You have unsaved changes. Are you sure you want to leave?");
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Warn user about unsaved changes before navigation (React Router)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoadingCourse) {
    return <LoadingScreen />;
  }

  if (previewMode) {
    return <CoursePreview />;
  }

  return (
    <CourseBuilderLayout>
      <div className="flex flex-col h-screen">
        <CourseBuilderHeader />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <CenterContent />
          <RightSidebar />
        </div>
      </div>
      
      {/* Global Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </CourseBuilderLayout>
  );
};

export default CourseBuilder;
