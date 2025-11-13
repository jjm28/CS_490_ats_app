// src/utils/safeUrl.ts
export function toSafeUrl(input?: string | null) {
  if (!input) return "";
  try {
    if (/^https?:\/\//i.test(input)) return input;
    if (input.startsWith("/")) return `${window.location.origin}${input}`;
    return new URL(input, window.location.origin).toString();
  } catch {
    return "";
  }
}
