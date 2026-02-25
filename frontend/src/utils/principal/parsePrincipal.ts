import { Principal } from '@icp-sdk/core/principal';

/**
 * Result type for Principal parsing operations
 */
export type ParsePrincipalResult =
  | { success: true; principal: Principal }
  | { success: false; error: string };

/**
 * Safely parses and normalizes a Principal from various input types
 * @param value - Principal instance or text representation
 * @returns ParsePrincipalResult with either the Principal or an error message
 */
export function parsePrincipal(value: unknown): ParsePrincipalResult {
  try {
    // If already a Principal instance, return it
    if (value && typeof value === 'object' && 'toText' in value) {
      return { success: true, principal: value as Principal };
    }

    // If it's a string, try to parse it
    if (typeof value === 'string') {
      if (value.trim() === '') {
        return { success: false, error: 'Principal ID cannot be empty' };
      }
      const principal = Principal.fromText(value);
      return { success: true, principal };
    }

    return { success: false, error: 'Invalid Principal format' };
  } catch (error) {
    console.error('Principal parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Principal ID',
    };
  }
}

/**
 * Validates that a value is a valid Principal
 * @param value - Value to validate
 * @returns true if valid Principal
 */
export function isValidPrincipal(value: unknown): value is Principal {
  const result = parsePrincipal(value);
  return result.success;
}
