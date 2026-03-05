/**
 * Converts common mutation errors into user-friendly messages
 * while preserving full error details in console logs
 */
export function getUserFriendlyError(error: unknown): string {
  // Log the full error for debugging
  console.error("Full error details:", error);

  // Handle string errors
  if (typeof error === "string") {
    // Preserve backend authorization messages
    if (error.includes("Unauthorized:")) {
      return error;
    }
    if (error.toLowerCase().includes("unauthorized")) {
      return "Please log in to perform this action.";
    }
    if (
      error.toLowerCase().includes("actor not available") ||
      error.toLowerCase().includes("actor not ready")
    ) {
      return "Connecting to backend... Please try again in a moment.";
    }
    if (error.toLowerCase().includes("invalid principal")) {
      return "Invalid Principal ID. Please refresh and try again.";
    }
    if (error.toLowerCase().includes("invalid date format")) {
      return "Invalid date format. Please select a valid date.";
    }
    if (error.toLowerCase().includes("invalid time format")) {
      return "Invalid time format. Please select a valid time.";
    }
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message;

    // Preserve backend authorization messages
    if (message.includes("Unauthorized:")) {
      return message;
    }

    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("not authenticated")
    ) {
      return "Please log in to perform this action.";
    }

    if (
      lowerMessage.includes("actor not available") ||
      lowerMessage.includes("actor not ready")
    ) {
      return "Connecting to backend... Please try again in a moment.";
    }

    if (lowerMessage.includes("invalid principal")) {
      return "Invalid Principal ID. Please refresh and try again.";
    }

    if (lowerMessage.includes("invalid date format")) {
      return "Invalid date format. Please select a valid date.";
    }

    if (lowerMessage.includes("invalid time format")) {
      return "Invalid time format. Please select a valid time.";
    }

    // Only convert generic trap/rejected messages
    if (
      (lowerMessage.includes("trap") || lowerMessage.includes("rejected")) &&
      !message.includes("Unauthorized:")
    ) {
      return "Operation failed. Please check your input and try again.";
    }

    return message;
  }

  // Handle objects with message property
  if (error && typeof error === "object" && "message" in error) {
    return getUserFriendlyError((error as any).message);
  }

  // Fallback
  return "An unexpected error occurred. Please try again.";
}
