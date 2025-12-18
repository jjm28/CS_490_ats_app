export function isGlassdoor(): boolean {
  return location.hostname.toLowerCase().includes("glassdoor.com");
}

export function looksLikeApplied(text: string): boolean {
  const t = text.toLowerCase();
  return (t.includes("applied") && t.includes("application")) || t.includes("application submitted");
}

function clean(s?: string | null): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

export function extractDetails(): { jobTitle: string; company: string; location: string } {
  const jobTitle =
    clean(document.querySelector('[data-test="job-title"]')?.textContent) ||
    clean(document.querySelector("h1")?.textContent);

  const company =
    clean(document.querySelector('[data-test="employer-name"]')?.textContent) ||
    clean(document.querySelector('[data-test="employer-short-name"]')?.textContent);

  const location =
    clean(document.querySelector('[data-test="location"]')?.textContent) ||
    clean(document.querySelector('[data-test="job-location"]')?.textContent);

  return { jobTitle, company, location };
}
