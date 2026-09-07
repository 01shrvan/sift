import type { Education, Project, Skill, Work } from "../schema.js";
import { findDateRange, hasDateRange, stripDateRange } from "./dates.js";
import { bulletGlyph, isBullet, stripBullet } from "./text.js";

const SPLIT = /\s*(?:\t|—|–|\||·|•|,|\s+at\s+|\s+@\s+)\s*|\s+-\s+/;

export function entryBulletTest(lines: string[]): (line: string) => boolean {
  const glyphs = new Map<string, { total: number; dated: number; first: number }>();
  lines.forEach((line, index) => {
    const glyph = bulletGlyph(line);
    if (glyph === null) return;
    const entry = glyphs.get(glyph) ?? { total: 0, dated: 0, first: index };
    entry.total += 1;
    if (hasDateRange(line)) entry.dated += 1;
    glyphs.set(glyph, entry);
  });
  if (glyphs.size < 2) {
    const opensWithBullet = lines.length > 0 && isBullet(lines[0]!);
    if (opensWithBullet) return (line: string) => isBullet(line);
    return (line: string) => isBullet(line) && hasDateRange(line);
  }
  const ranked = [...glyphs.entries()].sort((a, b) => {
    const rateA = a[1].dated / a[1].total;
    const rateB = b[1].dated / b[1].total;
    if (rateA !== rateB) return rateB - rateA;
    return a[1].first - b[1].first;
  });
  const entryGlyph = ranked[0]![0];
  return (line: string) => bulletGlyph(line) === entryGlyph;
}

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
  const startsEntry = entryBulletTest(lines);
  let current: Work | null = null;
  for (const raw of lines) {
    const line = startsEntry(raw) ? stripBullet(raw) : raw;
    if (line !== raw && !hasDateRange(line) && current !== null && current.name === null) {
      assignWorkTitle(current, line);
      continue;
    }
    if (line === raw && isBullet(line)) {
      if (current === null) {
        current = blankWork();
        entries.push(current);
      }
      current.highlights.push(stripBullet(line));
      continue;
    }
    if (line !== raw && !hasDateRange(line)) {
      current = blankWork();
      entries.push(current);
      assignWorkTitle(current, line);
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
    const score = readScore(piece);
    if (score !== null) {
      if (entry.score === null) entry.score = score;
      continue;
    }
    if (entry.institution === null) entry.institution = piece;
    else if (entry.area === null) entry.area = piece;
  }
}

export function parseEducation(lines: string[]): Education[] {
  const entries: Education[] = [];
  const startsEntry = entryBulletTest(lines);
  let current: Education | null = null;
  for (const raw of lines) {
    const isEntry = startsEntry(raw);
    if (!isEntry && isBullet(raw)) {
      if (current !== null) current.courses.push(stripBullet(raw));
      continue;
    }
    const line = isEntry ? stripBullet(raw) : raw;
    const range = hasDateRange(line) ? findDateRange(line) : null;
    const startsNew =
      current === null ||
      isEntry ||
      (range !== null && current.startDate !== null) ||
      (STUDY_TYPE.test(line) && current.studyType !== null);
    if (startsNew) {
      current = blankEducation();
      entries.push(current);
    }
    if (range !== null) {
      current!.startDate = range.startDate;
      current!.endDate = range.endDate;
    }
    const score = readScore(line);
    if (score !== null && current!.score === null) current!.score = score;
    const head = stripDateRange(line.split("\t")[0] ?? line);
    if (head.length > 0) assignEducation(current!, head);
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
