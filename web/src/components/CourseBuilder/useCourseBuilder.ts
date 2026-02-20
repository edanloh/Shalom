import { useContext } from "react";
import { CourseBuilderContext } from "./CourseBuilderContext";

export const useCourseBuilder = () => {
  const context = useContext(CourseBuilderContext);
  if (!context) {
    throw new Error(
      "useCourseBuilder must be used within CourseBuilderProvider",
    );
  }
  return context;
};
