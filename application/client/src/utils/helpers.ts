// emailValidators.ts
const LOCAL_PART =
  // no spaces/quotes, allows dot segments but not at ends or doubles
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)$/;

const DOMAIN_PART =
  // labels a-z0-9- separated by dots, no leading/trailing hyphen, last TLD 2-63 letters
  /^(?=.{1,255}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function splitEmail(email: string) {
  const at = email.indexOf("@");
  if (at === -1) return { local: "", domain: "" };
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}

export function isValidEmailBasic(email: string): boolean {
  if (!email || email.includes(" ")) return false;
  const { local, domain } = splitEmail(email);
  return LOCAL_PART.test(local) && DOMAIN_PART.test(domain);
}

// Optional: allow-list (e.g., your org) OR block-list (e.g., disposable)
const ALLOWED_DOMAINS = new Set<string>([
  // "yourcompany.com",
  // "partner.org",
]);

const BLOCKED_DOMAINS = new Set<string>([
  // a tiny sample; consider loading a maintained list serverside
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
]);

export function isAllowedDomain(domain: string): boolean {
  if (BLOCKED_DOMAINS.has(domain.toLowerCase())) return false;
  if (ALLOWED_DOMAINS.size > 0) return ALLOWED_DOMAINS.has(domain.toLowerCase());
  return true; // no allow-list defined
}

export function isValidPassword(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}