import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/env";
import apiService from "./apiService";

export type AchievementRecord = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  type: string;
  criteria: unknown;
  points: number;
  color: string | null;
  is_active: boolean;
  created_at: string;
  earnedBy?: number;
};

type ListResponse = {
  success?: boolean;
  data?: AchievementRecord[];
  count?: number;
  limit?: number;
  offset?: number;
};

const ENDPOINTS = {
  LIST: "/listAchievements",
  CREATE: "/createAchievement",
  UPDATE: "/updateAchievement",
  DELETE: "/deleteAchievement",
  UPLOAD_ICON: "/uploadAchievementIcon",
};

export async function listAchievements(params?: Record<string, string>) {
  const resp = await apiService.get<ListResponse>(ENDPOINTS.LIST, params);
  const items = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp as any) ? (resp as any) : [];
  return {
    items,
    count: resp?.count ?? items.length,
    limit: resp?.limit,
    offset: resp?.offset,
  };
}

export async function createAchievement(payload: Record<string, unknown>) {
  const resp = await apiService.post<any>(ENDPOINTS.CREATE, payload);
  return resp?.data ?? resp;
}

export async function updateAchievement(payload: Record<string, unknown>) {
  const resp = await apiService.post<any>(ENDPOINTS.UPDATE, payload);
  return resp?.data ?? resp;
}

export async function deleteAchievement(id: string) {
  const resp = await apiService.post<any>(ENDPOINTS.DELETE, { id });
  return resp?.data ?? resp;
}

export async function uploadAchievementIcon(file: File, achievementId?: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase configuration missing for icon upload");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (achievementId) {
    formData.append("achievementId", achievementId);
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1${ENDPOINTS.UPLOAD_ICON}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Icon upload failed");
  }

  const data = await response.json();
  return data?.data ?? data;
}
