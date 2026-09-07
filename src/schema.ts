import { z } from "zod";

export const Location = z.object({
  address: z.string().nullable(),
  postalCode: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  region: z.string().nullable(),
});

export const Profile = z.object({
  network: z.string(),
  username: z.string().nullable(),
  url: z.string(),
});

export const Basics = z.object({
  name: z.string().nullable(),
  label: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  url: z.string().nullable(),
  summary: z.string().nullable(),
  location: Location,
  profiles: z.array(Profile),
});

export const Work = z.object({
  name: z.string().nullable(),
  position: z.string().nullable(),
  url: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  summary: z.string().nullable(),
  highlights: z.array(z.string()),
});

export const Education = z.object({
  institution: z.string().nullable(),
  url: z.string().nullable(),
  area: z.string().nullable(),
  studyType: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  score: z.string().nullable(),
  courses: z.array(z.string()),
});

export const Skill = z.object({
  name: z.string(),
  level: z.string().nullable(),
  keywords: z.array(z.string()),
});

export const Project = z.object({
  name: z.string().nullable(),
  description: z.string().nullable(),
  url: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  highlights: z.array(z.string()),
});

export const Certificate = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
  url: z.string().nullable(),
});

export const Language = z.object({
  language: z.string(),
  fluency: z.string().nullable(),
});

export const FIELD_PATHS = [
  "basics.name",
  "basics.email",
  "basics.phone",
  "basics.location.city",
  "basics.profiles",
  "work",
  "education",
  "skills",
] as const;

export type FieldPath = (typeof FIELD_PATHS)[number];

export const Coverage = z.object({
  found: z.array(z.string()),
  missing: z.array(z.string()),
});

export const Meta = z.object({
  source: z.enum(["pdf", "docx", "text"]),
  pages: z.number().int().nonnegative(),
  characters: z.number().int().nonnegative(),
  usedFallback: z.boolean(),
  durationMs: z.number().nonnegative(),
  coverage: Coverage,
});

export const Resume = z.object({
  basics: Basics,
  work: z.array(Work),
  education: z.array(Education),
  skills: z.array(Skill),
  projects: z.array(Project),
  certificates: z.array(Certificate),
  languages: z.array(Language),
  meta: Meta,
});

export type Resume = z.infer<typeof Resume>;
export type Basics = z.infer<typeof Basics>;
export type Work = z.infer<typeof Work>;
export type Education = z.infer<typeof Education>;
export type Skill = z.infer<typeof Skill>;
export type Project = z.infer<typeof Project>;
export type Certificate = z.infer<typeof Certificate>;
export type Language = z.infer<typeof Language>;
export type Meta = z.infer<typeof Meta>;

export function emptyResume(): Omit<Resume, "meta"> {
  return {
    basics: {
      name: null,
      label: null,
      email: null,
      phone: null,
      url: null,
      summary: null,
      location: { address: null, postalCode: null, city: null, countryCode: null, region: null },
      profiles: [],
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
    languages: [],
  };
}
