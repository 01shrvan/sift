const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const EMAIL_GLOBAL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const URL_PATTERN =
  /\b(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s,;()<>\[\]]*)?/gi;

const TLDS = new Set([
  "com", "org", "net", "io", "dev", "ai", "co", "in", "me", "app", "xyz", "tech",
  "edu", "gov", "uk", "us", "ca", "de", "fr", "au", "nl", "se", "info", "biz",
  "pro", "site", "online", "page", "cloud", "design", "studio", "digital", "space",
]);

const PHONE_CANDIDATE = /(?:\+?\d|\()[\d\s().-]{7,}\d/g;

const NETWORKS: ReadonlyArray<{ network: string; host: RegExp }> = [
  { network: "LinkedIn", host: /(?:^|\.)linkedin\.com$/i },
  { network: "GitHub", host: /(?:^|\.)github\.(?:com|io)$/i },
  { network: "GitLab", host: /(?:^|\.)gitlab\.com$/i },
  { network: "X", host: /(?:^|\.)(?:twitter|x)\.com$/i },
  { network: "Behance", host: /(?:^|\.)behance\.net$/i },
  { network: "Dribbble", host: /(?:^|\.)dribbble\.com$/i },
  { network: "Stack Overflow", host: /(?:^|\.)stackoverflow\.com$/i },
  { network: "Medium", host: /(?:^|\.)medium\.com$/i },
  { network: "Kaggle", host: /(?:^|\.)kaggle\.com$/i },
  { network: "LeetCode", host: /(?:^|\.)leetcode\.com$/i },
];

export function findEmail(text: string): string | null {
  const match = text.match(EMAIL);
  return match === null ? null : match[0].toLowerCase();
}

export function findPhone(text: string): string | null {
  const candidates = text.match(PHONE_CANDIDATE) ?? [];
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) continue;
    if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(raw.trim())) continue;
    return raw.trim().replace(/\s{2,}/g, " ");
  }
  return null;
}

function parse(raw: string): URL | null {
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function usernameOf(parsed: URL, network: string): string | null {
  const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return null;
  if (network === "LinkedIn") {
    const idx = segments.findIndex((s) => s === "in" || s === "pub");
    return idx >= 0 && idx + 1 < segments.length ? segments[idx + 1]! : null;
  }
  return segments[0]!;
}

export type FoundProfile = { network: string; username: string | null; url: string };

export function findProfiles(text: string): { profiles: FoundProfile[]; site: string | null } {
  const withoutEmails = text.replace(EMAIL_GLOBAL, " ");
  const seen = new Set<string>();
  const profiles: FoundProfile[] = [];
  let site: string | null = null;
  for (const match of withoutEmails.matchAll(URL_PATTERN)) {
    const raw = match[0].replace(/[.,;:)]+$/, "");
    const parsed = parse(raw);
    if (parsed === null) continue;
    const host = parsed.hostname.replace(/^www\./, "");
    const tld = host.split(".").pop() ?? "";
    const known = NETWORKS.find((n) => n.host.test(host));
    if (known === undefined && !TLDS.has(tld.toLowerCase())) continue;
    const url = parsed.toString().replace(/\/$/, "");
    if (seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());
    if (known !== undefined) {
      profiles.push({ network: known.network, username: usernameOf(parsed, known.network), url });
    } else if (site === null) {
      site = url;
    }
  }
  return { profiles, site };
}
