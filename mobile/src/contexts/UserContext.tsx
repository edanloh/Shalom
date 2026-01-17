import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useAuth } from './AuthContext';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfilePic,
} from '@/services/userService';

interface UserProgress {
  courseId: string;
  progress: number;
  completed: boolean;
  lastAccessed: Date;
}

interface UserContextType {
  enrolledCourses: string[];
  progress: UserProgress[];
  completedCourses: string[];
  enrollInCourse: (courseId: string) => void;
  updateProgress: (courseId: string, progress: number) => void;
  markCourseComplete: (courseId: string) => void;
  getUserProgress: (courseId: string) => UserProgress | undefined;
  user: User | null;
  fetchUser: (email: string) => Promise<User>;
  updateUser: (id: string, payload: Partial<User>) => Promise<User>;
  uploadUserPic: (name: string, avatar: Blob) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { user: authUser } = useAuth();

  const enrollInCourse = (courseId: string) => {
    if (!enrolledCourses.includes(courseId)) {
      setEnrolledCourses([...enrolledCourses, courseId]);
      setProgress([...progress, {
          courseId,
          progress: 0,
          completed: false,
        lastAccessed: new Date()
      }]);
    }
  };

  const updateProgress = (courseId: string, newProgress: number) => {
    setProgress(prev => prev.map(p => 
        p.courseId === courseId
          ? { ...p, progress: newProgress, lastAccessed: new Date() }
          : p
    ));
  };

  const markCourseComplete = (courseId: string) => {
    if (!completedCourses.includes(courseId)) {
      setCompletedCourses([...completedCourses, courseId]);
      updateProgress(courseId, 100);
      setProgress(prev => prev.map(p => 
        p.courseId === courseId 
          ? { ...p, completed: true }
          : p
      ));
    }
  };

  const getUserProgress = (courseId: string) => {
    return progress.find(p => p.courseId === courseId);
  };

  useEffect(() => {
    if (authUser) {
      fetchUser(authUser!.email);
    }
  }, [authUser]);

  useEffect(() => {
    console.log("userContext user", user)
  }, [user])
  

  const fetchUser = async (email: string): Promise<User> => {
    const data = await fetchUserProfile(email);
    // Change the db's id to uuid
    data.uuid = data.id;
    data.id = authUser!.id; // set id to authUser id
    setUser(data);
    return data;
  };

  const updateUser = async (id: string, payload: Partial<User>): Promise<User> => {
    const data = await updateUserProfile(id, payload);
    fetchUser(authUser!.email);
    return data;
  };

  const uploadUserPic = async (name: string, avatar: Blob): Promise<void> => {
    await uploadProfilePic(name, avatar);
    fetchUser(authUser!.email);
  }

  return (
    <UserContext.Provider
      value={{
        user,
        updateUser,
        fetchUser,
        uploadUserPic,

        enrolledCourses,
        progress,
        completedCourses,
        enrollInCourse,
        updateProgress,
        markCourseComplete,
        getUserProgress
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