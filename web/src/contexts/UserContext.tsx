import {
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { UserContext } from './UserContextStore';

import { User } from '@/types';
import { useAuth } from './useAuth';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfilePic,
} from '@/services/userService';

export interface UserContextType {
  user: User | null;
  isLoading: boolean;
  fetchUser: (email: string) => Promise<User>;
  updateUser: (id: string, payload: Partial<User>) => Promise<User>;
  uploadUserPic: (name: string, avatar: Blob) => Promise<void>;
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuth();
  const authUserId = authUser?.id;

  const fetchUser = useCallback(
    async (email: string): Promise<User> => {
      setIsLoading(true);
      try {
        const data = await fetchUserProfile(email);
        // Change the db's id to uuid
        data.uuid = data.id;
        if (authUserId) {
          data.id = authUserId; // set id to auth user id when available
        }
        setUser(data);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [authUserId],
  );

  useEffect(() => {
    const fetchAndRegister = async () => {
      if (authUser) {
        setIsLoading(true);
        try {
          await fetchUser(authUser!.email);
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
      }
    };
    fetchAndRegister();
  }, [authUser, fetchUser]);

  const updateUser = async (
    id: string,
    payload: Partial<User>,
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await updateUserProfile(id, payload);
      await fetchUser(authUser!.email);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadUserPic = async (name: string, avatar: Blob): Promise<void> => {
    setIsLoading(true);
    try {
      await uploadProfilePic(name, avatar);
      await fetchUser(authUser!.email);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        updateUser,
        fetchUser,
        uploadUserPic,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
