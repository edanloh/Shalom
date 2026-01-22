import apiService from "@/services/apiService";

/**
 * Toggles a student's enabled status in Supabase Auth + users table
 * @param studentId - The email of the student
 * @param status - Optional. If true, enables the user. If false or undefined, disables the user
 * @returns Promise<boolean> - True if operation succeeded
 */
export async function disableStudent({
  studentId,
  status = false,
}: {
  studentId: string;
  status?: boolean;
}): Promise<boolean> {
  try {
    console.log(
      `Attempting to ${status ? "enable" : "disable"} student: ${studentId}`
    );

    const response = await apiService.post<any>("/toggleUserEnabled", {
      email: studentId,
      enabled: status,
    });

    if (response?.success === false) {
      throw new Error(response.error || "Failed to update student status");
    }

    const action = status ? "enabled" : "disabled";
    console.log(`Successfully ${action} student: ${studentId}`);
    return true;
  } catch (error) {
    console.error("Error toggling student status:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unknown error occurred while updating student status.");
  }
}
