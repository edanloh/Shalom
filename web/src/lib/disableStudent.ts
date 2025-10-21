import { API_BASE_URL } from "@/env";

/**
 * Toggles a student's enabled status in AWS Cognito via Lambda function
 * @param studentId - The email of the student in Cognito
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
    if (!API_BASE_URL) {
      throw new Error(
        "API_BASE_URL is not configured. Please set VITE_API_BASE_URL in your .env file"
      );
    }

    console.log(
      `Attempting to ${status ? "enable" : "disable"} student: ${studentId}`
    );

    // Call the Lambda function via API Gateway
    const response = await fetch(`${API_BASE_URL}/admin/toggleUserEnabled`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: studentId,
        enabled: status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    const action = status ? "enabled" : "disabled";
    console.log(`Successfully ${action} student: ${studentId}`);
    alert(`Successfully ${action} student: ${studentId}`);

    return true;
  } catch (error) {
    console.error("Error toggling student status:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      alert(`Failed to update student status: ${error.message}`);
    } else {
      alert("An unknown error occurred while updating student status.");
    }

    return false;
  }
}
