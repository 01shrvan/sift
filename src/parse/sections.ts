export type SectionKind =
  | "summary"
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "certificates"
  | "languages"
  | "awards"
  | "interests"
  | "publications"
  | "volunteer";

const VOCABULARY: ReadonlyArray<{ kind: SectionKind; patterns: RegExp }> = [
  { kind: "summary", patterns: /^(?:professional\s+|career\s+|personal\s+)?(?:summary|profile|objective|about(?:\s+me)?|overview)$/ },
  { kind: "work", patterns: /^(?:work|professional|employment|industry|industrial|relevant)?\s*(?:experience|history|employment)$|^(?:internships?|work)$|^career\s+history$/ },
  { kind: "education", patterns: /^(?:education(?:al)?|academics?|academic\s+background|qualifications?|educational\s+qualifications?|academic\s+qualifications?)$/ },
  { kind: "skills", patterns: /^(?:technical\s+|core\s+|key\s+|professional\s+)?(?:skills|competenc(?:y|ies)|technologies|tech\s+stack|expertise|proficienc(?:y|ies))$/ },
  { kind: "projects", patterns: /^(?:personal\s+|academic\s+|key\s+|selected\s+|side\s+)?projects?$/ },
  { kind: "certificates", patterns: /^(?:certifications?|certificates?|licenses?(?:\s*&?\s*certifications?)?|courses(?:\s*&?\s*certifications?)?|trainings?)$/ },
  { kind: "languages", patterns: /^languages?(?:\s+known)?$/ },
  { kind: "awards", patterns: /^(?:awards?|achievements?|honou?rs?|accomplishments?)(?:\s*&?\s*(?:awards?|achievements?|honou?rs?))?$/ },
  { kind: "interests", patterns: /^(?:interests?|hobbies|activities|extracurriculars?|extra[\s-]?curricular(?:\s+activities)?)$/ },
  { kind: "publications", patterns: /^(?:publications?|papers?|research)$/ },
  { kind: "volunteer", patterns: /^(?:volunteer(?:ing)?(?:\s+experience)?|community(?:\s+(?:service|involvement))?)$/ },
];

const MAX_HEADING_LENGTH = 60;

export function headingKind(line: string): SectionKind | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_HEADING_LENGTH) return null;
  if (/^[•‣▪●◦⁃∙*]/.test(trimmed)) return null;
  const cleaned = trimmed
    .replace(/[:：]\s*$/, "")
    .replace(/^[^\p{L}]+/u, "")
    .replace(/[^\p{L}\s&-]+$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (cleaned.length === 0) return null;
  for (const entry of VOCABULARY) {
    if (entry.patterns.test(cleaned)) return entry.kind;
  }
  return null;
}

export type Segmented = {
  header: string[];
  sections: Map<SectionKind, string[]>;
};

export function splitSections(lines: string[]): Segmented {
  const header: string[] = [];
  const sections = new Map<SectionKind, string[]>();
  let current: SectionKind | null = null;
  for (const line of lines) {
    const kind = headingKind(line);
    if (kind !== null) {
      current = kind;
      if (!sections.has(kind)) sections.set(kind, []);
      continue;
    }
    if (current === null) header.push(line);
    else sections.get(current)!.push(line);
  }
  return { header, sections };
}
