import React, { createContext, useContext, useState } from 'react';

interface UserProgress {
  courseId: string;
  progress: number;
  completed: boolean;
  lastAccessed: Date;
}

interface UserContextType {
  enrolledCourses: string[];
  // progress: UserProgress[];
  progress_percentage: number[];
  completedCourses: string[];
  enrollInCourse: (courseId: string) => void;
  // updateProgress: (courseId: string, progress: number) => void;
  // markCourseComplete: (courseId: string) => void;
  // getUserProgress: (courseId: string) => UserProgress | undefined;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [progress_percentage, setProgressPercentage] = useState<number[]>([]);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);

  const enrollInCourse = (courseId: string) => {
    if (!enrolledCourses.includes(courseId)) {
      setEnrolledCourses([...enrolledCourses, courseId]);
      setProgressPercentage([...progress_percentage, 0]);
    }
  };

  // const updateProgress = (courseId: string, newProgress: number) => {
  //   const courseIndex = enrolledCourses.indexOf(courseId);
  //   if (courseIndex !== -1) {
  //     setProgressPercentage(prev => {
  //       const updated = [...prev];
  //       updated[courseIndex] = newProgress;
  //       return updated;
  //     });
  //   }
  // };

  // const markCourseComplete = (courseId: string) => {
  //   if (!completedCourses.includes(courseId)) {
  //     setCompletedCourses([...completedCourses, courseId]);
  //     updateProgress(courseId, 100);
  //   }
  // };

  // const getUserProgress = (courseId: string) => {
  //   const courseIndex = enrolledCourses.indexOf(courseId);
  //   if (courseIndex !== -1) {
  //     return {
  //       courseId,
  //       progress: progress_percentage[courseIndex],
  //       completed: completedCourses.includes(courseId),
  //       lastAccessed: new Date()
  //     };
  //   }
  //   return undefined;
  // };

  return (
    <UserContext.Provider value={{
      enrolledCourses,
      progress_percentage,
      completedCourses,
      enrollInCourse,
      // updateProgress,
      // markCourseComplete
      // getUserProgress
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};