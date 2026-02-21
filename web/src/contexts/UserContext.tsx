import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

import { User } from '@/types';
import { useAuth } from './AuthContext';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadProfilePic,
  registerCheck,
} from '@/services/userService';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  fetchUser: (email: string) => Promise<User>;
  updateUser: (id: string, payload: Partial<User>) => Promise<User>;
  uploadUserPic: (name: string, avatar: Blob) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { authUser } = useAuth();

  const fetchUser = useCallback(
    async (email: string): Promise<User> => {
      setIsLoading(true);
      try {
        const data = await fetchUserProfile(email);
        // Change the db's id to uuid
        data.uuid = data.id;
        data.id = authUser!.id; // set id to authUser id
        setUser(data);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [authUser],
  );

  useEffect(() => {
    const fetchAndRegister = async () => {
      if (authUser) {
        setIsLoading(true);
        try {
          await registerCheck(authUser);
          await fetchUser(authUser!.email);
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

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
