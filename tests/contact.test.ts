import { describe, expect, it } from "vitest";
import { findEmail, findPhone, findProfiles } from "../src/parse/contact.js";
import { normaliseLetterSpacing, toLines, isBullet, stripBullet } from "../src/parse/text.js";

describe("findEmail", () => {
  it("finds and lowercases an address", () => {
    expect(findEmail("Reach me at Jane.Doe@Example.COM today")).toBe("jane.doe@example.com");
  });
  it("handles plus addressing", () => {
    expect(findEmail("jane+jobs@example.co.uk")).toBe("jane+jobs@example.co.uk");
  });
  it("returns null when absent", () => {
    expect(findEmail("no address here")).toBeNull();
  });
});

describe("findPhone", () => {
  it("reads an indian mobile with country code", () => {
    expect(findPhone("Phone: +91 84519 74359")).toBe("+91 84519 74359");
  });
  it("preserves the formatting as written", () => {
    expect(findPhone("123-456-7890")).toBe("123-456-7890");
  });
  it("reads a bracketed us number", () => {
    expect(findPhone("(415) 555-2671")).toBe("(415) 555-2671");
  });
  it("ignores a year range", () => {
    expect(findPhone("Worked 2019 - 2023 at Acme")).toBeNull();
  });
  it("ignores digit runs that are too short", () => {
    expect(findPhone("Room 4021")).toBeNull();
  });
});

describe("findProfiles", () => {
  it("classifies linkedin and github and pulls usernames", () => {
    const { profiles } = findProfiles("https://linkedin.com/in/janedoe and github.com/janed");
    expect(profiles).toEqual([
      { network: "LinkedIn", username: "janedoe", url: "https://linkedin.com/in/janedoe" },
      { network: "GitHub", username: "janed", url: "https://github.com/janed" },
    ]);
  });
  it("treats an unknown host as the personal site", () => {
    const { profiles, site } = findProfiles("see janedoe.dev for more");
    expect(profiles).toEqual([]);
    expect(site).toBe("https://janedoe.dev");
  });
  it("strips trailing punctuation", () => {
    const { site } = findProfiles("portfolio at www.jane.io.");
    expect(site).toBe("https://www.jane.io");
  });
  it("does not read library names as domains", () => {
    const { profiles, site } = findProfiles("Skills: Node.js, React.js, Vue.js, Express.js");
    expect(profiles).toEqual([]);
    expect(site).toBeNull();
  });
  it("does not read an email domain as a site", () => {
    const { site } = findProfiles("jane.doe@example.com");
    expect(site).toBeNull();
  });
  it("reads a bare linkedin path", () => {
    const { profiles } = findProfiles("linkedin.com/in/shrvan-benke");
    expect(profiles[0]).toEqual({
      network: "LinkedIn",
      username: "shrvan-benke",
      url: "https://linkedin.com/in/shrvan-benke",
    });
  });
  it("deduplicates repeats", () => {
    const { profiles } = findProfiles("github.com/janed github.com/janed");
    expect(profiles).toHaveLength(1);
  });
});

describe("text helpers", () => {
  it("collapses letter spaced headings", () => {
    expect(normaliseLetterSpacing("E D U C A T I O N")).toBe("EDUCATION");
  });
  it("leaves ordinary sentences alone", () => {
    expect(normaliseLetterSpacing("Led a team of six engineers")).toBe("Led a team of six engineers");
  });
  it("splits and trims lines", () => {
    expect(toLines("  one  \n\n\t two\n")).toEqual(["one", "two"]);
  });
  it("detects and strips bullets", () => {
    expect(isBullet("• shipped it")).toBe(true);
    expect(stripBullet("• shipped it")).toBe("shipped it");
  });
});
