import { AUTH_STORAGE_KEY } from "@/env";

export { useAuth } from "@/contexts/useAuth";

// Utility function to sign out locally (no Cognito redirect needed for custom auth)
export const signOut = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = "/login";
};
