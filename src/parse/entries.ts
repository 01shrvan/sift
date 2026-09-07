import type { Education, Project, Skill, Work } from "../schema.js";
import { findDateRange, hasDateRange, stripDateRange } from "./dates.js";
import { isBullet, stripBullet } from "./text.js";

const SPLIT = /\s*(?:—|–|\||·|•|,|\s+at\s+|\s+@\s+)\s*|\s+-\s+/;

const CORPORATE_SUFFIX = /^(?:inc|llc|ltd|limited|pvt|private|co|corp|corporation|gmbh|plc|llp|sa|bv|ag)\.?$/i;

const ROLE =
  /\b(?:engineer|developer|programmer|manager|intern(?:ship)?|analyst|designer|consultant|lead|head|director|architect|scientist|officer|associate|assistant|specialist|administrator|founder|owner|coordinator|executive|technician|researcher|trainee|freelancer?|contractor)\b/i;

const STUDY_TYPE =
  /\b(?:b\.?\s?tech|b\.?\s?e\.?|b\.?\s?sc|b\.?\s?com|bca|bba|m\.?\s?tech|m\.?\s?sc|m\.?\s?com|mca|mba|ph\.?\s?d|diploma|bachelors?|masters?|doctorate|hsc|ssc|higher\s+secondary|secondary|class\s+(?:x|xii|10|12))\b/i;

const SCORE =
  /\b(?:cgpa|gpa|sgpa|percentage|score|marks)\s*[:\-–]?\s*(\d{1,2}(?:\.\d{1,2})?(?:\s*\/\s*\d{1,2}(?:\.\d{1,2})?)?)|(\d{1,3}(?:\.\d{1,2})?)\s*%/i;

const INSTITUTION =
  /\b(?:university|college|institute|school|academy|polytechnic|iit|nit|iiit|bits|vjti|spit)\b/i;

function blankWork(): Work {
  return {
    name: null,
    position: null,
    url: null,
    startDate: null,
    endDate: null,
    summary: null,
    highlights: [],
  };
}

function blankEducation(): Education {
  return {
    institution: null,
    url: null,
    area: null,
    studyType: null,
    startDate: null,
    endDate: null,
    score: null,
    courses: [],
  };
}

function parts(line: string): string[] {
  const raw = line
    .split(SPLIT)
    .map((p) => p.replace(/^[\s,;:]+|[\s,;:]+$/g, "").trim())
    .filter((p) => p.length > 0);
  const merged: string[] = [];
  for (const piece of raw) {
    if (merged.length > 0 && CORPORATE_SUFFIX.test(piece)) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}, ${piece}`;
      continue;
    }
    merged.push(piece);
  }
  return merged;
}

function assignWorkTitle(entry: Work, line: string): void {
  const pieces = parts(line);
  if (pieces.length === 0) return;
  if (pieces.length === 1) {
    const only = pieces[0]!;
    if (ROLE.test(only) && entry.position === null) entry.position = only;
    else if (entry.name === null) entry.name = only;
    else if (entry.position === null) entry.position = only;
    return;
  }
  const roleIndex = pieces.findIndex((p) => ROLE.test(p));
  if (roleIndex >= 0) {
    if (entry.position === null) entry.position = pieces[roleIndex]!;
    const other = pieces.find((_, i) => i !== roleIndex);
    if (entry.name === null && other !== undefined) entry.name = other;
    return;
  }
  if (entry.name === null) entry.name = pieces[0]!;
  if (entry.position === null && pieces.length > 1) entry.position = pieces[1]!;
}

export function parseWork(lines: string[]): Work[] {
  const entries: Work[] = [];
  let current: Work | null = null;
  for (const line of lines) {
    if (isBullet(line)) {
      if (current === null) {
        current = blankWork();
        entries.push(current);
      }
      current.highlights.push(stripBullet(line));
      continue;
    }
    if (hasDateRange(line)) {
      const range = findDateRange(line);
      const rest = stripDateRange(line);
      const attachable =
        current !== null && current.startDate === null && current.highlights.length === 0;
      if (attachable && rest.length === 0) {
        current!.startDate = range?.startDate ?? null;
        current!.endDate = range?.endDate ?? null;
        continue;
      }
      current = blankWork();
      entries.push(current);
      current.startDate = range?.startDate ?? null;
      current.endDate = range?.endDate ?? null;
      if (rest.length > 0) assignWorkTitle(current, rest);
      continue;
    }
    if (current === null) {
      current = blankWork();
      entries.push(current);
      assignWorkTitle(current, line);
      continue;
    }
    if (current.name === null || current.position === null) {
      assignWorkTitle(current, line);
      continue;
    }
    current.summary = current.summary === null ? line : `${current.summary} ${line}`;
  }
  return entries.filter((e) => e.name !== null || e.position !== null || e.highlights.length > 0);
}

function readScore(line: string): string | null {
  const match = line.match(SCORE);
  if (match === null) return null;
  if (match[1] !== undefined) return match[1].replace(/\s+/g, "");
  if (match[2] !== undefined) return `${match[2]}%`;
  return null;
}

function assignEducation(entry: Education, line: string): void {
  for (const piece of parts(line)) {
    if (entry.studyType === null && STUDY_TYPE.test(piece)) {
      entry.studyType = piece.match(STUDY_TYPE)![0].trim();
      const area = piece
        .replace(STUDY_TYPE, " ")
        .replace(/\b(?:in|of)\b/gi, " ")
        .replace(/[(),]/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (area.length > 1 && entry.area === null) entry.area = area;
      continue;
    }
    if (entry.institution === null && INSTITUTION.test(piece)) {
      entry.institution = piece;
      continue;
    }
    if (entry.score === null) {
      const score = readScore(piece);
      if (score !== null) {
        entry.score = score;
        continue;
      }
    }
    if (entry.institution === null) entry.institution = piece;
    else if (entry.area === null) entry.area = piece;
  }
}

export function parseEducation(lines: string[]): Education[] {
  const entries: Education[] = [];
  let current: Education | null = null;
  for (const line of lines) {
    if (isBullet(line)) {
      if (current !== null) current.courses.push(stripBullet(line));
      continue;
    }
    const range = hasDateRange(line) ? findDateRange(line) : null;
    const rest = range === null ? line : stripDateRange(line);
    const startsNew =
      current === null ||
      (range !== null && current.startDate !== null) ||
      (STUDY_TYPE.test(rest) && current.studyType !== null);
    if (startsNew) {
      current = blankEducation();
      entries.push(current);
    }
    if (range !== null) {
      current!.startDate = range.startDate;
      current!.endDate = range.endDate;
    }
    if (current!.score === null) {
      const score = readScore(rest);
      if (score !== null) current!.score = score;
    }
    if (rest.length > 0) assignEducation(current!, rest);
  }
  return entries.filter((e) => e.institution !== null || e.studyType !== null);
}

const SKILL_SPLIT = /[,;|·•]|\s{3,}/;

export function parseSkills(lines: string[]): Skill[] {
  const skills: Skill[] = [];
  for (const raw of lines) {
    const line = stripBullet(raw);
    if (line.length === 0) continue;
    const labelled = line.match(/^([^:]{2,40}):\s*(.+)$/);
    if (labelled !== null) {
      const keywords = labelled[2]!
        .split(SKILL_SPLIT)
        .map((k) => k.trim())
        .filter((k) => k.length > 0 && k.length < 60);
      if (keywords.length > 0) {
        skills.push({ name: labelled[1]!.trim(), level: null, keywords });
        continue;
      }
    }
    const keywords = line
      .split(SKILL_SPLIT)
      .map((k) => k.trim())
      .filter((k) => k.length > 0 && k.length < 60);
    for (const keyword of keywords) skills.push({ name: keyword, level: null, keywords: [] });
  }
  return skills;
}

function blankProject(): Project {
  return { name: null, description: null, url: null, startDate: null, endDate: null, highlights: [] };
}

export function parseProjects(lines: string[]): Project[] {
  const projects: Project[] = [];
  let current: Project | null = null;
  for (const line of lines) {
    if (isBullet(line)) {
      if (current === null) {
        current = blankProject();
        projects.push(current);
      }
      current.highlights.push(stripBullet(line));
      continue;
    }
    const range = hasDateRange(line) ? findDateRange(line) : null;
    const rest = range === null ? line : stripDateRange(line);
    const pieces = parts(rest);
    current = blankProject();
    current.name = pieces[0] ?? (rest.length > 0 ? rest : null);
    current.startDate = range?.startDate ?? null;
    current.endDate = range?.endDate ?? null;
    if (pieces.length > 1) current.description = pieces.slice(1).join(" — ");
    projects.push(current);
  }
  return projects.filter((p) => p.name !== null || p.highlights.length > 0);
}
