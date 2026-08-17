/**
 * Formats a date as `YYYY-MM-DD HH:mm`.
 * Matches the format Obsidian's file creation date uses, e.g. `2025-02-15 12:03`.
 * @param date The date to format.
 */
export function formatDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
