import { emptyResume, FIELD_PATHS, type Certificate, type Language, type Resume } from "../schema.js";
import { findEmail, findPhone, findProfiles } from "./contact.js";
import { parseEducation, parseProjects, parseSkills, parseWork } from "./entries.js";
import { splitSections } from "./sections.js";
import { isBullet, stripBullet, toLines } from "./text.js";

const NAME_REJECT = /[@\d]|https?:|www\.|\bcurriculum\b|\bresume\b|\bcv\b/i;

export function findName(header: string[]): string | null {
  for (const line of header) {
    if (line.length > 60 || NAME_REJECT.test(line)) continue;
    const words = line.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 2 || words.length > 5) continue;
    if (!words.every((w) => /^[\p{L}][\p{L}'.-]*$/u.test(w))) continue;
    return line;
  }
  return null;
}

function findLabel(header: string[], name: string | null): string | null {
  const index = name === null ? -1 : header.indexOf(name);
  for (let i = index + 1; i < header.length; i++) {
    const line = header[i]!;
    if (line.length > 80 || NAME_REJECT.test(line)) continue;
    if (line.split(/\s+/).length > 8) continue;
    return line;
  }
  return null;
}

function parseCertificates(lines: string[]): Certificate[] {
  return lines
    .map((line) => stripBullet(line).trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ name: line, issuer: null, date: null, url: null }));
}

function parseLanguages(lines: string[]): Language[] {
  const out: Language[] = [];
  for (const raw of lines) {
    const line = stripBullet(raw).trim();
    if (line.length === 0) continue;
    for (const chunk of line.split(/[,;|·•]/)) {
      const piece = chunk.trim();
      if (piece.length === 0) continue;
      const withFluency = piece.match(/^(.+?)\s*[({[]\s*([^)}\]]+)\s*[)}\]]$/);
      if (withFluency !== null) {
        out.push({ language: withFluency[1]!.trim(), fluency: withFluency[2]!.trim() });
        continue;
      }
      const dashed = piece.match(/^(.+?)\s+[-–—:]\s+(.+)$/);
      if (dashed !== null) {
        out.push({ language: dashed[1]!.trim(), fluency: dashed[2]!.trim() });
        continue;
      }
      out.push({ language: piece, fluency: null });
    }
  }
  return out;
}

function coverageOf(resume: Omit<Resume, "meta">): { found: string[]; missing: string[] } {
  const present: Record<string, boolean> = {
    "basics.name": resume.basics.name !== null,
    "basics.email": resume.basics.email !== null,
    "basics.phone": resume.basics.phone !== null,
    "basics.location.city": resume.basics.location.city !== null,
    "basics.profiles": resume.basics.profiles.length > 0,
    work: resume.work.length > 0,
    education: resume.education.length > 0,
    skills: resume.skills.length > 0,
  };
  const found: string[] = [];
  const missing: string[] = [];
  for (const path of FIELD_PATHS) {
    if (present[path] === true) found.push(path);
    else missing.push(path);
  }
  return { found, missing };
}

export function assemble(text: string): Omit<Resume, "meta"> {
  const resume = emptyResume();
  const lines = toLines(text);
  const { header, sections } = splitSections(lines);

  resume.basics.email = findEmail(text);
  resume.basics.phone = findPhone(text);
  const { profiles, site } = findProfiles(text);
  resume.basics.profiles = profiles;
  resume.basics.url = site;
  resume.basics.name = findName(header);
  resume.basics.label = findLabel(header, resume.basics.name);

  const summary = sections.get("summary");
  if (summary !== undefined && summary.length > 0) {
    resume.basics.summary = summary.map((l) => (isBullet(l) ? stripBullet(l) : l)).join(" ");
  }

  resume.work = parseWork(sections.get("work") ?? []);
  resume.education = parseEducation(sections.get("education") ?? []);
  resume.skills = parseSkills(sections.get("skills") ?? []);
  resume.projects = parseProjects(sections.get("projects") ?? []);
  resume.certificates = parseCertificates(sections.get("certificates") ?? []);
  resume.languages = parseLanguages(sections.get("languages") ?? []);

  return resume;
}

export { coverageOf };
