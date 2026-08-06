/**
 * Utility functions for user-friendly authentication error messages
 * and structured authentication logging.
 */

export function formatAuthError(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const errObj = error as { message?: string; status?: number; code?: string; name?: string; cause?: unknown };
  const message = errObj.message || String(error);
  const lowerMsg = message.toLowerCase();

  // Network connection / backend offline errors
  if (
    errObj.status === 0 ||
    errObj.name === "AuthRetryableFetchError" ||
    lowerMsg.includes("fetch failed") ||
    lowerMsg.includes("failed to fetch") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("networkerror")
  ) {
    return process.env.NODE_ENV === "development"
      ? "Unable to connect to authentication server. Please ensure the backend server is running on http://localhost:3001 and try again."
      : "Unable to connect to authentication server. Please check your network connection and try again.";
  }

  // Invalid login credentials
  if (lowerMsg.includes("invalid login credentials") || lowerMsg.includes("invalid login")) {
    return "Wrong mobile number/email or PIN.";
  }

  if (lowerMsg.includes("invalid grant")) {
    return "Invalid verification code or PIN.";
  }

  return message;
}

export function logAuthEvent(action: string, metadata?: Record<string, unknown>, error?: unknown) {
  const timestamp = new Date().toISOString();
  if (error) {
    console.error(`[Auth Frontend Error] [${timestamp}] ${action}:`, error, metadata || {});
  } else {
    console.log(`[Auth Frontend Success] [${timestamp}] ${action}`, metadata || {});
  }
}
