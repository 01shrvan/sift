import { describe, expect, it } from "vitest";
import { parseEducation, parseProjects, parseSkills, parseWork } from "../src/parse/entries.js";

describe("parseWork", () => {
  it("reads company, role and dates from one line", () => {
    const [entry] = parseWork(["Acme Corp — Senior Engineer | Jan 2020 – Mar 2023"]);
    expect(entry).toMatchObject({
      name: "Acme Corp",
      position: "Senior Engineer",
      startDate: "2020-01",
      endDate: "2023-03",
    });
  });

  it("attaches a date line that follows the header", () => {
    const [entry] = parseWork(["Acme Corp", "Senior Engineer", "Jan 2020 - Present"]);
    expect(entry).toMatchObject({
      name: "Acme Corp",
      position: "Senior Engineer",
      startDate: "2020-01",
      endDate: "present",
    });
  });

  it("collects bullets as highlights", () => {
    const [entry] = parseWork([
      "Acme — Engineer | 2020 - 2023",
      "• Cut p99 latency by 40 percent",
      "• Led a team of four",
    ]);
    expect(entry!.highlights).toEqual(["Cut p99 latency by 40 percent", "Led a team of four"]);
  });

  it("splits two roles into two entries", () => {
    const entries = parseWork([
      "Acme — Engineer | 2020 - 2023",
      "• shipped things",
      "Globex — Intern | 2019 - 2020",
      "• learned things",
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.name).toBe("Acme");
    expect(entries[1]!.name).toBe("Globex");
    expect(entries[1]!.position).toBe("Intern");
  });

  it("identifies the role regardless of which side it is on", () => {
    const [entry] = parseWork(["Backend Developer, Globex | 2021 - 2022"]);
    expect(entry).toMatchObject({ name: "Globex", position: "Backend Developer" });
  });

  it("reads a role written with at", () => {
    const [entry] = parseWork(["Software Engineer at Acme | 2020 - 2022"]);
    expect(entry).toMatchObject({ name: "Acme", position: "Software Engineer" });
  });

  it("keeps a corporate suffix with the company name", () => {
    const [entry] = parseWork(["Acme, Inc. - Senior Engineer | 2020 - 2022"]);
    expect(entry).toMatchObject({ name: "Acme, Inc.", position: "Senior Engineer" });
  });

  it("returns nothing for empty input", () => {
    expect(parseWork([])).toEqual([]);
  });
});

describe("parseEducation", () => {
  it("reads institution, degree and years", () => {
    const [entry] = parseEducation(["Mumbai University — B.Tech in Computer Engineering | 2017 - 2021"]);
    expect(entry).toMatchObject({
      institution: "Mumbai University",
      studyType: "B.Tech",
      startDate: "2017",
      endDate: "2021",
    });
    expect(entry!.area).toContain("Computer Engineering");
  });

  it("reads a cgpa", () => {
    const [entry] = parseEducation(["VJTI — B.Tech | 2018 - 2022", "CGPA: 8.7"]);
    expect(entry!.score).toBe("8.7");
  });

  it("reads a percentage", () => {
    const [entry] = parseEducation(["St Xavier College — HSC | 2015 - 2017", "85.4%"]);
    expect(entry!.score).toBe("85.4%");
  });

  it("splits two degrees into two entries", () => {
    const entries = parseEducation([
      "IIT Bombay — M.Tech | 2021 - 2023",
      "Mumbai University — B.Tech | 2017 - 2021",
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.studyType).toBe("M.Tech");
    expect(entries[1]!.studyType).toBe("B.Tech");
  });
});

describe("parseSkills", () => {
  it("reads a labelled group into keywords", () => {
    expect(parseSkills(["Languages: Go, Rust, TypeScript"])).toEqual([
      { name: "Languages", level: null, keywords: ["Go", "Rust", "TypeScript"] },
    ]);
  });

  it("reads a bare comma list as individual skills", () => {
    expect(parseSkills(["Docker, Kubernetes"])).toEqual([
      { name: "Docker", level: null, keywords: [] },
      { name: "Kubernetes", level: null, keywords: [] },
    ]);
  });

  it("strips bullets", () => {
    expect(parseSkills(["• Postgres"])).toEqual([{ name: "Postgres", level: null, keywords: [] }]);
  });

  it("drops empty lines", () => {
    expect(parseSkills(["", "   "])).toEqual([]);
  });
});

describe("parseProjects", () => {
  it("reads a name and highlights", () => {
    const [project] = parseProjects(["weft — HTTP/2 server in Rust", "• passes h2spec 146 of 146"]);
    expect(project!.name).toBe("weft");
    expect(project!.description).toBe("HTTP/2 server in Rust");
    expect(project!.highlights).toEqual(["passes h2spec 146 of 146"]);
  });

  it("splits multiple projects", () => {
    const projects = parseProjects(["weft — a server", "• one", "parchi — an organiser", "• two"]);
    expect(projects).toHaveLength(2);
    expect(projects[1]!.name).toBe("parchi");
  });
});
