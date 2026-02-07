/**
 * Parses a string input into a bigint suitable for Nat backend types
 * Rejects empty, negative, non-integer, and non-finite values
 */
export function parseNatBigInt(value: string): { success: true; value: bigint } | { success: false; error: string } {
  // Trim whitespace
  const trimmed = value.trim();
  
  // Check for empty
  if (!trimmed) {
    return { success: false, error: 'Value cannot be empty' };
  }
  
  // Parse as number first to validate
  const num = Number(trimmed);
  
  // Check for NaN
  if (isNaN(num)) {
    return { success: false, error: 'Value must be a valid number' };
  }
  
  // Check for finite
  if (!isFinite(num)) {
    return { success: false, error: 'Value must be finite' };
  }
  
  // Check for negative
  if (num < 0) {
    return { success: false, error: 'Value cannot be negative' };
  }
  
  // Check for integer
  if (!Number.isInteger(num)) {
    return { success: false, error: 'Value must be a whole number' };
  }
  
  // Convert to bigint
  try {
    const bigIntValue = BigInt(Math.floor(num));
    return { success: true, value: bigIntValue };
  } catch (e) {
    return { success: false, error: 'Failed to convert to valid number' };
  }
}

/**
 * Validates a numeric input string for Nat conversion
 * Returns error message if invalid, null if valid
 */
export function validateNatInput(value: string): string | null {
  const result = parseNatBigInt(value);
  return result.success ? null : result.error;
}
