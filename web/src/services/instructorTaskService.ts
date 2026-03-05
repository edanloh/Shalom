import apiService from "./apiService";

export interface InstructorTask {
  id: string;
  instructorId: string;
  title: string;
  count: number;
  status: string;
  dueAt?: string | null;
  createdAt?: string;
}

const ENDPOINTS = {
  CREATE: "/postInstructorTask",
  UPDATE: "/updateInstructorTask",
  DELETE: "/deleteInstructorTask",
} as const;

export const instructorTaskService = {
  async createTask(input: {
    instructorId: string;
    title: string;
    count?: number;
    dueAt?: string | null;
  }): Promise<InstructorTask | null> {
    const resp = await apiService.post<any>(ENDPOINTS.CREATE, input);
    const raw = resp?.data ?? resp;
    if (!raw) return null;
    return {
      id: raw.id,
      instructorId: raw.instructor_id ?? raw.instructorId,
      title: raw.title,
      count: Number(raw.count ?? 0),
      status: raw.status,
      dueAt: raw.due_at ?? raw.dueAt ?? null,
      createdAt: raw.created_at ?? raw.createdAt,
    };
  },
  async completeTask(taskId: string): Promise<InstructorTask | null> {
    const resp = await apiService.post<any>(ENDPOINTS.UPDATE, {
      taskId,
      status: "completed",
    });
    const raw = resp?.data ?? resp;
    if (!raw) return null;
    return {
      id: raw.id,
      instructorId: raw.instructor_id ?? raw.instructorId,
      title: raw.title,
      count: Number(raw.count ?? 0),
      status: raw.status,
      dueAt: raw.due_at ?? raw.dueAt ?? null,
      createdAt: raw.created_at ?? raw.createdAt,
    };
  },
  async deleteTask(taskId: string): Promise<number> {
    const resp = await apiService.post<any>(ENDPOINTS.DELETE, { taskId });
    return Number(resp?.data?.deleted ?? resp?.deleted ?? 0);
  },
};

export default instructorTaskService;
