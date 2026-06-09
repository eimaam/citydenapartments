/**
 * Escape special regex characters in user-provided search strings
 * to prevent ReDoS attacks via catastrophic backtracking.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
