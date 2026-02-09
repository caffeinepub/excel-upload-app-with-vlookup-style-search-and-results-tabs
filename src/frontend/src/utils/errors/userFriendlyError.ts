/**
 * Converts common mutation errors into user-friendly messages
 * while preserving full error details in console logs
 */
export function getUserFriendlyError(error: unknown): string {
  // Log the full error for debugging
  console.error('Full error details:', error);

  // Handle string errors
  if (typeof error === 'string') {
    if (error.toLowerCase().includes('unauthorized')) {
      return 'Please log in to perform this action.';
    }
    if (error.toLowerCase().includes('actor not available') || error.toLowerCase().includes('actor not ready')) {
      return 'Connecting to backend... Please try again in a moment.';
    }
    if (error.toLowerCase().includes('invalid principal')) {
      return 'Invalid Principal ID. Please refresh and try again.';
    }
    if (error.toLowerCase().includes('invalid date format')) {
      return 'Invalid date format. Please select a valid date.';
    }
    if (error.toLowerCase().includes('invalid time format')) {
      return 'Invalid time format. Please select a valid time.';
    }
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('not authenticated')) {
      return 'Please log in to perform this action.';
    }
    
    if (message.includes('actor not available') || message.includes('actor not ready')) {
      return 'Connecting to backend... Please try again in a moment.';
    }
    
    if (message.includes('invalid principal')) {
      return 'Invalid Principal ID. Please refresh and try again.';
    }
    
    if (message.includes('invalid date format')) {
      return 'Invalid date format. Please select a valid date.';
    }
    
    if (message.includes('invalid time format')) {
      return 'Invalid time format. Please select a valid time.';
    }
    
    if (message.includes('trap') || message.includes('rejected')) {
      return 'Operation failed. Please check your input and try again.';
    }
    
    return error.message;
  }

  // Handle objects with message property
  if (error && typeof error === 'object' && 'message' in error) {
    return getUserFriendlyError((error as any).message);
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
}
