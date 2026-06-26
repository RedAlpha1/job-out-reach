import type { ParsedJD } from "../types";

/**
 * Derive a company name from an email address by inspecting its domain.
 * e.g. "hr@razorpay.com" -> "Razorpay", "careers@flipkart.in" -> "Flipkart".
 * Returns null for free/personal mail providers where the domain says nothing
 * about the employer.
 */
const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
]);

export function companyFromEmail(email: string): string | null {
  const at = email.indexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || GENERIC_DOMAINS.has(domain)) return null;

  // Strip common public-suffix-ish tails to isolate the brand label.
  const labels = domain.split(".").filter(Boolean);
  if (labels.length === 0) return null;

  // For "jobs.razorpay.com" prefer "razorpay" (second-to-last before TLD),
  // for "razorpay.com" prefer "razorpay".
  const ignore = new Set(["com", "in", "co", "io", "org", "net", "ai", "app", "us"]);
  const meaningful = labels.filter((l) => !ignore.has(l));
  const brand = meaningful.length > 0 ? meaningful[meaningful.length - 1] : labels[0];

  return titleCase(brand);
}

function titleCase(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// A pragmatic list of skills/technologies we look for in a JD. Matching is
// case-insensitive and word-boundary aware so "Java" doesn't match "JavaScript".
const SKILL_DICTIONARY = [
  "Kotlin",
  "Java",
  "Android",
  "Jetpack Compose",
  "Compose",
  "Coroutines",
  "RxJava",
  "Dagger",
  "Hilt",
  "Retrofit",
  "MVVM",
  "MVI",
  "Clean Architecture",
  "Room",
  "SQLite",
  "Gradle",
  "Espresso",
  "JUnit",
  "Firebase",
  "REST",
  "GraphQL",
  "gRPC",
  "Kotlin Multiplatform",
  "KMP",
  "Flutter",
  "Dart",
  "React Native",
  "CI/CD",
  "Git",
  "Material Design",
  "Accessibility",
  "Performance",
  "Unit Testing",
  "WorkManager",
  "Navigation",
  "Ktor",
  "OkHttp",
  "Swift",
  "iOS",
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Microservices",
  "AWS",
  "Kubernetes",
];

const ROLE_KEYWORDS =
  "(Senior |Lead |Staff |Principal |Sr\\.? )?(Android|Mobile|Software|Backend|Full[ -]?Stack|Frontend|iOS)? ?(Engineer|Developer|Architect|SDE|Programmer)( I{1,3}| [12])?";

export function parseJD(text: string): ParsedJD {
  const trimmed = text.trim();
  if (!trimmed) return { company: null, role: null, skills: [] };

  return {
    company: extractCompany(trimmed),
    role: extractRole(trimmed),
    skills: extractSkills(trimmed),
  };
}

function extractCompany(text: string): string | null {
  // Common phrasings: "at Razorpay", "Razorpay is hiring", "About <Company>".
  const patterns = [
    /\bat\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?:[,.\n]|\s+(?:is|we|are|in|as|for)\b)/,
    /\b([A-Z][A-Za-z0-9&.\- ]{1,40}?)\s+is\s+(?:hiring|looking|seeking)/,
    /\bAbout\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)[:\n]/,
    /\bcompany\s*:\s*([A-Za-z0-9&.\- ]{1,40})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const candidate = m[1].trim().replace(/\s+/g, " ");
      if (candidate.length >= 2) return candidate;
    }
  }
  return null;
}

function extractRole(text: string): string | null {
  const labelled = text.match(/\b(?:role|position|title)\s*:\s*([^\n]{2,60})/i);
  if (labelled && labelled[1]) return labelled[1].trim();

  const re = new RegExp(ROLE_KEYWORDS, "i");
  const m = text.match(re);
  if (m && m[0]) {
    const role = m[0].trim().replace(/\s+/g, " ");
    // Avoid matching a lone "Engineer" with no qualifier as noise.
    if (role.length > 4) return titleCaseRole(role);
  }
  return null;
}

function titleCaseRole(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

function extractSkills(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const skill of SKILL_DICTIONARY) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "i");
    if (re.test(text) && !seen.has(skill.toLowerCase())) {
      seen.add(skill.toLowerCase());
      found.push(skill);
    }
  }
  return found;
}
