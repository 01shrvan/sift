import { describe, expect, it } from "vitest";
import { entryBulletTest, parseEducation, parseWork } from "../src/parse/entries.js";

describe("entryBulletTest", () => {
  it("treats the dated glyph as the entry marker when two glyphs are used", () => {
    const lines = ["• Engineer\t2020 - 2023", "Acme\tMumbai", "– did a thing", "– did another"];
    const test = entryBulletTest(lines);
    expect(test("• Engineer\t2020 - 2023")).toBe(true);
    expect(test("– did a thing")).toBe(false);
  });

  it("treats bullets as entries when the section opens with one", () => {
    const lines = ["• Vidyalankar Polytechnic\tMumbai", "Diploma\t2023 - 2026"];
    const test = entryBulletTest(lines);
    expect(test("• Vidyalankar Polytechnic\tMumbai")).toBe(true);
  });

  it("treats bullets as highlights when the section opens with a header", () => {
    const lines = ["Acme — Engineer | 2020 - 2023", "• shipped it"];
    const test = entryBulletTest(lines);
    expect(test("• shipped it")).toBe(false);
  });
});

describe("bullet led work sections", () => {
  it("reads a role bullet followed by a company line", () => {
    const entries = parseWork([
      "• Full Stack Engineer\tJul 2025 - Oct 2025",
      "Ayritech\tMumbai",
      "– Built the in-house website builder",
      "• Frontend Engineer\tOct 2024 - Sep 2025",
      "DreamSkrin\tRemote",
      "– Built campaign pages",
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      name: "Ayritech",
      position: "Full Stack Engineer",
      startDate: "2025-07",
      endDate: "2025-10",
    });
    expect(entries[0]!.highlights).toEqual(["Built the in-house website builder"]);
    expect(entries[1]!.name).toBe("DreamSkrin");
  });
});

describe("bullet led education sections", () => {
  const entries = parseEducation([
    "• Vidyalankar Polytechnic\tWadala, Mumbai",
    "Diploma in Computer Engineering\t2023 - 2026",
    "• The Blossoms Sunderbhai Thackersey English High School\tMarine Lines, Mumbai",
    "SSC | Passed with 86%\t2013 - 2023",
  ]);

  it("reads both institutions", () => {
    expect(entries).toHaveLength(2);
    expect(entries[0]!.institution).toBe("Vidyalankar Polytechnic");
    expect(entries[1]!.institution).toBe("The Blossoms Sunderbhai Thackersey English High School");
  });

  it("keeps the address out of the institution name", () => {
    expect(entries[0]!.institution).not.toContain("Wadala");
  });

  it("reads the degree and years", () => {
    expect(entries[0]).toMatchObject({ studyType: "Diploma", startDate: "2023", endDate: "2026" });
  });

  it("reads a percentage score without polluting other fields", () => {
    expect(entries[1]!.score).toBe("86%");
    expect(entries[1]!.area).toBeNull();
  });
});
