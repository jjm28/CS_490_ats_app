export function isIndeed(): boolean {
  return location.hostname.toLowerCase().includes("indeed.com");
}

export function looksLikeApplied(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("application submitted") || t.includes("you applied");
}

function clean(s?: string | null): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

export function extractDetails(): { jobTitle: string; company: string; location: string } {
  const jobTitle =
    clean(document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent) ||
    clean(document.querySelector("h1")?.textContent);

  const company =
    clean(document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent) ||
    clean(document.querySelector('[data-testid="companyName"]')?.textContent);

  const location =
    clean(document.querySelector('[data-testid="inlineHeader-companyLocation"]')?.textContent) ||
    clean(document.querySelector('[data-testid="job-location"]')?.textContent);

  return { jobTitle, company, location };
}
