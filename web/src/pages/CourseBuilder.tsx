import React from "react";
import {
  CourseBuilderProvider,
  useCourseBuilder,
  CourseBuilderLayout,
  CourseBuilderHeader,
  LeftSidebar,
  RightSidebar,
  CoursePreview,
  CenterContent,
} from "../components/CourseBuilder";

const CourseBuilder = () => {
  return (
    <CourseBuilderProvider>
      <CourseBuilderMain />
    </CourseBuilderProvider>
  );
};

const CourseBuilderMain = () => {
  const { previewMode } = useCourseBuilder();

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
    </CourseBuilderLayout>
  );
};

export default CourseBuilder;
