
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_FOR_COVERLETTER);

const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

// super small cache: Map<string, number[]>  (keyed by the exact text)
const EMBCache = new Map();

/** Cosine similarity between two vectors */
export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    dot += x * y; na += x * x; nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/** Get (and cache) embedding for a text */
export async function embed(text) {
  const key = text || "";
  if (EMBCache.has(key)) return EMBCache.get(key);
  const res = await model.embedContent(key);
  const vec = res?.embedding?.values || [];
  EMBCache.set(key, vec);
  return vec;
}

/**
 * Run N async jobs with concurrency cap.
 * (Avoids hammering Gemini; 2–3 is a safe default.)
 */
export async function runLimited(tasks, conc = 3) {
  const out = new Array(tasks.length);
  let i = 0, active = 0;
  return new Promise((resolve) => {
    const kick = () => {
      if (i >= tasks.length && active === 0) return resolve(out);
      while (active < conc && i < tasks.length) {
        const idx = i++;
        active++;
        tasks[idx]()
          .then(v => { out[idx] = v; })
          .catch(() => { out[idx] = null; })
          .finally(() => { active--; kick(); });
      }
    };
    kick();
  });
}


