/**
 * Sanitize user-selected text before sending to API.
 * Strips control characters, normalizes whitespace.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export function isTextEmpty(text: string): boolean {
  return !text || text.trim().length === 0;
}

export function truncateText(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
