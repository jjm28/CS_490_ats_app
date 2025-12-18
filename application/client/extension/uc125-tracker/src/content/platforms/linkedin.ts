// CS_490_ats_app/application/client/extension/uc125-tracker/src/content/platforms/linkedin.ts

type Details = { jobTitle: string; company: string; location: string };

function norm(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function firstText(selectors: string[]): string {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    const t = norm(el?.textContent || "");
    if (t) return t;
  }
  return "";
}

function activeJobCardText(): { title: string; company: string; location: string } {
  // LinkedIn jobs list view (left rail) when a job is selected
  const root =
    document.querySelector<HTMLElement>("li.jobs-search-results__list-item--active") ||
    document.querySelector<HTMLElement>("li.jobs-search-results__list-item.active") ||
    document.querySelector<HTMLElement>(".jobs-search-results__list-item--active");

  const title = norm(
    root?.querySelector<HTMLElement>("a.job-card-list__title, a.job-card-container__link")?.textContent || ""
  );

  const company = norm(
    root?.querySelector<HTMLElement>(
      ".job-card-container__company-name, .job-card-container__primary-description, a.job-card-container__company-name"
    )?.textContent || ""
  );

  const location = norm(
    root?.querySelector<HTMLElement>(
      ".job-card-container__metadata-item, .job-card-container__metadata-wrapper li, .artdeco-entity-lockup__caption"
    )?.textContent || ""
  );

  return { title, company, location };
}

function getApplicationSentModalText(): string {
  const modal =
    document.querySelector<HTMLElement>(".artdeco-modal[role='dialog']") ||
    document.querySelector<HTMLElement>(".artdeco-modal") ||
    document.querySelector<HTMLElement>("[role='dialog']");

  return norm(modal?.innerText || "");
}

function parseCompanyFromSentModalText(txt: string): string {
  // Examples:
  // "Your application was sent to Ascendion!"
  // "Your application was sent to The Dignify Solutions, LLC!"
  const m = txt.match(/your application was sent to\s+(.+?)([!.]|$)/i);
  return m ? norm(m[1]) : "";
}

export function isLinkedIn(): boolean {
  return location.hostname.includes("linkedin.com") && location.pathname.startsWith("/jobs");
}

export function hasApplicationSentConfirmation(): boolean {
  // Strongest signal: the “Application sent” dialog text
  const txt = getApplicationSentModalText();
  if (/application sent/i.test(txt)) return true;
  if (/your application was sent to/i.test(txt)) return true;
  return false;
}

export function looksLikeApplied(pageTextSample: string): boolean {
  // Used by the generic observer in contentScript
  if (hasApplicationSentConfirmation()) return true;

  const t = norm(pageTextSample || "");
  return /application sent|your application was sent to/i.test(t);
}

export function extractDetails(): Details {
  // 1) Job details panel / view page (right pane)
  let jobTitle = firstText([
    "h1.jobs-unified-top-card__job-title",
    "h1.job-details-jobs-unified-top-card__job-title",
    ".job-details-jobs-unified-top-card__job-title h1",
    "h1.t-24",
    "h1",
  ]);

  let company = firstText([
    ".job-details-jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name",
    "a[data-control-name='company_link']",
  ]);

  let locationText = firstText([
    ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
    ".jobs-unified-top-card__bullet",
    ".job-details-jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__primary-description",
    ".job-details-jobs-unified-top-card__primary-description",
  ]);

  // 2) Fallback: active job card in list view
  if (!jobTitle || !company) {
    const card = activeJobCardText();
    if (!jobTitle) jobTitle = card.title;
    if (!company) company = card.company;
    if (!locationText) locationText = card.location;
  }

  // 3) Fallback: "Application sent" modal often contains company name
  if (!company) {
    const modalTxt = getApplicationSentModalText();
    const c = parseCompanyFromSentModalText(modalTxt);
    if (c) company = c;
  }

  return {
    jobTitle: norm(jobTitle),
    company: norm(company),
    location: norm(locationText),
  };
}
