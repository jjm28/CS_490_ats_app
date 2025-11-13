// Simple readability helper (Flesch–Kincaid grade approximation)
// Not perfect but lightweight for client-side use.

export function computeReadability(text: string): {
  grade: number;
  score: number;
  category: "easy" | "medium" | "hard";
} {
  if (!text.trim()) return { grade: 0, score: 100, category: "easy" };

  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const syllables = countSyllables(text);

  // Flesch–Kincaid Grade Level Formula
  const grade =
    0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

  // Easy readability score (0–100)
  const score = Math.max(0, Math.min(100, 100 - grade * 5));

  let category: "easy" | "medium" | "hard" = "easy";
  if (score < 35) category = "hard";
  else if (score < 70) category = "medium";

  return { grade, score, category };
}

function countSyllables(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .match(/[aeiouy]{1,2}/g)?.length || 1;
}
