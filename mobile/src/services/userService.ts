// src/services/userService.ts
// UserService for fetching and updating user profile and info

import { API_BASE_URL } from 'react-native-dotenv';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  role?: string;
  // Add other fields as needed
}

export const fetchUserProfile = async (email: string): Promise<UserProfile> => {
  const response = await fetch(
    `${API_BASE_URL}/dev/getUserInfo?email=${email}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  if (!response.ok) {
    throw new Error('Failed to fetch user info from API Gateway');
  }
  return await response.json();
};

export const updateUserProfile = async (
  userId: string,
  data: Partial<UserProfile>
): Promise<UserProfile> => {
  const response = await fetch(
    `${API_BASE_URL}/dev/updateUserInfo?userId=${userId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to update user info');
  }
  return await response.json();
};

// Add more user-related functions as needed
