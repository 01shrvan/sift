import { describe, expect, it } from "vitest";
import { detectKind, parseText } from "../src/parse/document.js";
import { findName } from "../src/parse/index.js";

const RESUME = `Shrvan Benke
Backend Engineer
shrvan@example.com | +91 84519 74359 | Mumbai, India
github.com/01shrvan | linkedin.com/in/shrvan-benke

SUMMARY
Backend engineer who builds systems graded by external conformance suites.

EXPERIENCE
Acme Corp — Senior Backend Engineer | Jan 2022 – Present
• Cut p99 latency from 380ms to 42ms
• Owned the payments ledger

Globex — Backend Intern | Jun 2021 - Dec 2021
• Built an ingestion pipeline

EDUCATION
Mumbai University — B.Tech in Computer Engineering | 2017 - 2021
CGPA: 8.7

TECHNICAL SKILLS
Languages: Rust, TypeScript, Go
Infrastructure: Docker, Kubernetes, Postgres

PROJECTS
weft — HTTP/2 server in Rust
• Passes h2spec 146 of 146

CERTIFICATIONS
AWS Certified Solutions Architect

LANGUAGES KNOWN
English (Fluent), Hindi (Native), Marathi
`;

describe("parseText", () => {
  const resume = parseText(RESUME);

  it("reads the basics", () => {
    expect(resume.basics.name).toBe("Shrvan Benke");
    expect(resume.basics.email).toBe("shrvan@example.com");
    expect(resume.basics.phone).toBe("+91 84519 74359");
    expect(resume.basics.label).toBe("Backend Engineer");
    expect(resume.basics.location).toMatchObject({ city: "Mumbai", countryCode: "IN" });
  });

  it("reads the profiles", () => {
    const networks = resume.basics.profiles.map((p) => p.network).sort();
    expect(networks).toEqual(["GitHub", "LinkedIn"]);
    const github = resume.basics.profiles.find((p) => p.network === "GitHub");
    expect(github!.username).toBe("01shrvan");
  });

  it("reads the summary", () => {
    expect(resume.basics.summary).toContain("conformance suites");
  });

  it("reads two roles with dates and highlights", () => {
    expect(resume.work).toHaveLength(2);
    expect(resume.work[0]).toMatchObject({
      name: "Acme Corp",
      position: "Senior Backend Engineer",
      startDate: "2022-01",
      endDate: "present",
    });
    expect(resume.work[0]!.highlights).toHaveLength(2);
    expect(resume.work[1]!.position).toBe("Backend Intern");
  });

  it("reads education with a score", () => {
    expect(resume.education).toHaveLength(1);
    expect(resume.education[0]).toMatchObject({
      institution: "Mumbai University",
      studyType: "B.Tech",
      startDate: "2017",
      endDate: "2021",
      score: "8.7",
    });
  });

  it("reads grouped skills", () => {
    const languages = resume.skills.find((s) => s.name === "Languages");
    expect(languages!.keywords).toEqual(["Rust", "TypeScript", "Go"]);
  });

  it("reads projects", () => {
    expect(resume.projects[0]!.name).toBe("weft");
    expect(resume.projects[0]!.highlights).toEqual(["Passes h2spec 146 of 146"]);
  });

  it("reads certificates", () => {
    expect(resume.certificates[0]!.name).toBe("AWS Certified Solutions Architect");
  });

  it("reads languages with fluency", () => {
    expect(resume.languages).toEqual([
      { language: "English", fluency: "Fluent" },
      { language: "Hindi", fluency: "Native" },
      { language: "Marathi", fluency: null },
    ]);
  });

  it("reports coverage honestly", () => {
    expect(resume.meta.coverage.found).toContain("work");
    expect(resume.meta.coverage.found).toContain("education");
    expect(resume.meta.coverage.found).toContain("basics.location.city");
    expect(resume.meta.coverage.missing).toEqual([]);
  });

  it("reports timing", () => {
    expect(resume.meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(resume.meta.source).toBe("text");
  });
});

describe("parseText on a sparse document", () => {
  it("returns nulls rather than inventing values", () => {
    const resume = parseText("Just some prose with no structure at all.");
    expect(resume.basics.name).toBeNull();
    expect(resume.basics.email).toBeNull();
    expect(resume.work).toEqual([]);
    expect(resume.meta.coverage.found).toEqual([]);
    expect(resume.meta.coverage.missing).toHaveLength(8);
  });
});

describe("findName", () => {
  it("skips a document title", () => {
    expect(findName(["CURRICULUM VITAE", "Shrvan Benke"])).toBe("Shrvan Benke");
  });
  it("skips a contact line", () => {
    expect(findName(["shrvan@example.com", "Shrvan Benke"])).toBe("Shrvan Benke");
  });
  it("returns null when nothing looks like a name", () => {
    expect(findName(["+91 84519 74359", "https://example.com"])).toBeNull();
  });
});

describe("detectKind", () => {
  it("detects a pdf by magic bytes", () => {
    expect(detectKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("pdf");
  });
  it("detects a zip container as docx", () => {
    expect(detectKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("docx");
  });
  it("falls back to text", () => {
    expect(detectKind(new TextEncoder().encode("Shrvan Benke"))).toBe("text");
  });
});
