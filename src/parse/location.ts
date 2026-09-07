const COUNTRIES: Record<string, string> = {
  india: "IN",
  "united states": "US",
  usa: "US",
  us: "US",
  "united states of america": "US",
  "united kingdom": "GB",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  canada: "CA",
  australia: "AU",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  singapore: "SG",
  ireland: "IE",
  spain: "ES",
  italy: "IT",
  sweden: "SE",
  switzerland: "CH",
  poland: "PL",
  japan: "JP",
  china: "CN",
  brazil: "BR",
  mexico: "MX",
  "new zealand": "NZ",
  "south africa": "ZA",
  uae: "AE",
  "united arab emirates": "AE",
};

const INDIAN_REGIONS = new Set([
  "maharashtra", "karnataka", "tamil nadu", "telangana", "delhi", "gujarat", "rajasthan",
  "west bengal", "kerala", "punjab", "haryana", "uttar pradesh", "madhya pradesh", "bihar",
  "odisha", "assam", "jharkhand", "chhattisgarh", "goa", "andhra pradesh", "uttarakhand",
  "himachal pradesh", "jammu and kashmir", "chandigarh", "puducherry",
]);

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
]);

const SEGMENT = /\s*(?:\||·|•|—|–)\s*/;
const PLACE_WORD = /^[\p{Lu}][\p{L}.'-]*$/u;
const REJECT = /\d|@|https?:|www\./i;

export type ParsedLocation = {
  city: string | null;
  region: string | null;
  countryCode: string | null;
};

function isPlace(value: string): boolean {
  const words = value.trim().split(/\s+/);
  if (words.length === 0 || words.length > 3) return false;
  return words.every((w) => PLACE_WORD.test(w));
}

function classify(pieces: string[]): ParsedLocation | null {
  if (pieces.length < 2 || pieces.length > 3) return null;
  const last = pieces[pieces.length - 1]!;
  const country = COUNTRIES[last.toLowerCase()];
  if (country !== undefined) {
    const city = pieces[0]!;
    const region = pieces.length === 3 ? pieces[1]! : null;
    if (!isPlace(city)) return null;
    if (region !== null && !isPlace(region)) return null;
    return { city, region, countryCode: country };
  }
  if (pieces.length === 2) {
    const city = pieces[0]!;
    if (!isPlace(city)) return null;
    if (US_STATES.has(last.toUpperCase()) && last.length === 2) {
      return { city, region: last.toUpperCase(), countryCode: "US" };
    }
    if (INDIAN_REGIONS.has(last.toLowerCase())) {
      return { city, region: last, countryCode: "IN" };
    }
  }
  return null;
}

export function findLocation(lines: string[]): ParsedLocation | null {
  for (const line of lines) {
    for (const segment of line.split(SEGMENT)) {
      const candidate = segment.trim().replace(/[.,;]+$/, "");
      if (candidate.length === 0 || candidate.length > 60) continue;
      if (REJECT.test(candidate)) continue;
      const pieces = candidate.split(/\s*,\s*/).map((p) => p.trim()).filter((p) => p.length > 0);
      const parsed = classify(pieces);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}
