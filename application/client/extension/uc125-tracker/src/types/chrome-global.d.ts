export {};

declare global {
  // Minimal typing so TS recognizes Chrome extension APIs without extra deps.
  // (If you later install @types/chrome, you can delete this file.)
  const chrome: any;
}