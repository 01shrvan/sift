import { describe, expect, it } from "vitest";
import { headingKind, splitSections } from "../src/parse/sections.js";

describe("headingKind", () => {
  it("recognises plain headings", () => {
    expect(headingKind("EXPERIENCE")).toBe("work");
    expect(headingKind("Education")).toBe("education");
    expect(headingKind("SKILLS")).toBe("skills");
  });
  it("recognises qualified headings", () => {
    expect(headingKind("Professional Experience")).toBe("work");
    expect(headingKind("Technical Skills")).toBe("skills");
    expect(headingKind("Academic Qualifications")).toBe("education");
  });
  it("tolerates a trailing colon", () => {
    expect(headingKind("Skills:")).toBe("skills");
  });
  it("recognises indian resume phrasing", () => {
    expect(headingKind("Educational Qualifications")).toBe("education");
    expect(headingKind("Languages Known")).toBe("languages");
    expect(headingKind("Extra-Curricular Activities")).toBe("interests");
  });
  it("rejects a sentence that merely contains a heading word", () => {
    expect(headingKind("Experience building distributed systems at scale")).toBeNull();
  });
  it("rejects a bullet", () => {
    expect(headingKind("• Skills")).toBeNull();
  });
  it("rejects a long line", () => {
    expect(headingKind("Education".padEnd(70, " x"))).toBeNull();
  });
});

describe("splitSections", () => {
  it("keeps pre heading lines as the header", () => {
    const { header } = splitSections(["Jane Doe", "jane@example.com", "EXPERIENCE", "Acme"]);
    expect(header).toEqual(["Jane Doe", "jane@example.com"]);
  });
  it("routes lines into their section", () => {
    const { sections } = splitSections([
      "Jane Doe",
      "EXPERIENCE",
      "Acme — Engineer",
      "EDUCATION",
      "IIT — B.Tech",
    ]);
    expect(sections.get("work")).toEqual(["Acme — Engineer"]);
    expect(sections.get("education")).toEqual(["IIT — B.Tech"]);
  });
  it("merges a repeated heading into one section", () => {
    const { sections } = splitSections(["SKILLS", "Go", "SKILLS", "Rust"]);
    expect(sections.get("skills")).toEqual(["Go", "Rust"]);
  });
  it("creates an empty section for a heading with no body", () => {
    const { sections } = splitSections(["AWARDS"]);
    expect(sections.get("awards")).toEqual([]);
  });
});
