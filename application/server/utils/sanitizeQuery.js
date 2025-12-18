export function sanitizeQuery(input = {}) {
  for (const key in input) {
    const value = input[key];

    // Prevent NoSQL injection operators from being injected
    if (key.startsWith("$")) {
      delete input[key];
      continue;
    }

    if (typeof value === "string") {
      input[key] = value.replace(/[$.]/g, ""); 
    }
  }
  return input;
}
