/**
 * Formats error objects for logging, extracting useful properties
 *
 * @param error - Error object, Supabase error, or unknown
 * @returns Formatted error string with message, code, details, etc.
 *
 * @example
 * try {
 *   await supabase.from('table').select();
 * } catch (error) {
 *   console.error('Database query failed:', formatError(error));
 *   // Output: "Database query failed: message="Connection timeout", code="PGRST301", details="...""
 * }
 */
export function formatError(error: unknown): string {
  if (!error) return 'Unknown error (null/undefined)';

  // Standard Error objects
  if (error instanceof Error) {
    const parts = [`message="${error.message}"`, `name="${error.name}"`];
    if (error.stack) parts.push(`stack="${error.stack.split('\n')[0]}"`);
    if ('cause' in error && error.cause) parts.push(`cause="${error.cause}"`);
    return parts.join(', ');
  }

  // Supabase/PostgreSQL errors (object with message, code, details, hint)
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const parts: string[] = [];

    if ('message' in obj && obj.message) parts.push(`message="${obj.message}"`);
    if ('code' in obj && obj.code) parts.push(`code="${obj.code}"`);
    if ('details' in obj && obj.details) parts.push(`details="${obj.details}"`);
    if ('hint' in obj && obj.hint) parts.push(`hint="${obj.hint}"`);

    if (parts.length > 0) return parts.join(', ');

    // Fallback: try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  // Primitive types
  return String(error);
}

/**
 * Logs error with formatted output
 *
 * @param context - Descriptive context (e.g., "Error loading job preferences")
 * @param error - Error object
 *
 * @example
 * try {
 *   await loadData();
 * } catch (error) {
 *   logError('Error loading job preferences', error);
 * }
 */
export function logError(context: string, error: unknown): void {
  console.error(`${context}:`, formatError(error));
}
