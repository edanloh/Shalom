import React, { useEffect, useState } from "react";
import {
  useParams,
  useBeforeUnload,
  useNavigate,
} from "react-router-dom";
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
  const {
    previewMode,
    isLoadingCourse,
    hasUnsavedChanges,
    modalState,
    closeModal,
    isSaving,
  } = useCourseBuilder();
  const navigate = useNavigate();
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const allowNavigationRef = React.useRef(false);

  // Intercept browser/history back when there are unsaved changes.
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) {
      return;
    }

    const guardState = { courseBuilderUnsavedGuard: true };
    window.history.pushState(guardState, "", window.location.href);

    const handlePopState = () => {
      if (allowNavigationRef.current || !hasUnsavedChanges) {
        return;
      }

      setPendingNavigation("__BACK__");
      setShowUnsavedModal(true);
      // Stay on page until user confirms leaving.
      window.history.pushState(guardState, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges, isSaving]);

  // Intercept in-app anchor/link clicks to keep confirmation behavior consistent.
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("rel")?.includes("external")
      ) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

      if (nextUrl.origin !== currentUrl.origin || nextPath === currentPath) {
        return;
      }

      event.preventDefault();
      setPendingNavigation(nextPath);
      setShowUnsavedModal(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges, isSaving]);

  // Warn user about unsaved changes before leaving page (tab close/refresh)
  useBeforeUnload(
    React.useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
          return event.returnValue;
        }
      },
      [hasUnsavedChanges]
    )
  );

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedModal(false);
    const destination = pendingNavigation;
    setPendingNavigation(null);

    if (destination && destination !== "__BACK__") {
      allowNavigationRef.current = true;
      navigate(destination);
      return;
    }

    allowNavigationRef.current = true;
    window.history.back();
  };

  const handleStayAndSave = () => {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  };

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
      
      {/* Saving Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">Saving course...</p>
            <p className="text-white/70 text-sm mt-2">Please wait, do not close this window</p>
          </div>
        </div>
      )}
      
      {/* Unsaved Changes Warning Modal */}
      <ConfirmationModal
        isOpen={showUnsavedModal}
        onClose={handleStayAndSave}
        onConfirm={handleLeaveWithoutSaving}
        title="Unsaved Changes"
        message="You have unsaved changes. If you leave without saving, your changes will be lost. Are you sure you want to leave?"
        type="warning"
        confirmText="Leave Without Saving"
        cancelText="Keep Editing"
        showCancel={true}
      />
      
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
