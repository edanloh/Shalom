import { createContext } from "react";
import type { CourseBuilderContextType } from "./CourseBuilderContext";

export const CourseBuilderContext = createContext<
  CourseBuilderContextType | undefined
>(undefined);
