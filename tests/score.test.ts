import { describe, expect, it } from "vitest";
import { normalise, scoreScalar, scoreSet, summarise } from "../eval/score.js";

describe("normalise", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalise("Acme, Inc.")).toBe("acme inc");
  });
  it("collapses whitespace", () => {
    expect(normalise("  Mumbai   India ")).toBe("mumbai india");
  });
});

describe("scoreScalar", () => {
  it("marks a match correct despite punctuation", () => {
    expect(scoreScalar("name", "Shrvan Benke", "Shrvan  Benke").outcome).toBe("correct");
  });
  it("marks a mismatch wrong", () => {
    expect(scoreScalar("name", "Shrvan Benke", "Someone Else").outcome).toBe("wrong");
  });
  it("marks a null result as missed", () => {
    expect(scoreScalar("phone", "+91 84519 74359", null).outcome).toBe("missed");
  });
  it("marks a value where truth is null as invented", () => {
    expect(scoreScalar("city", null, "Atlantis").outcome).toBe("invented");
  });
  it("marks both null as absent", () => {
    expect(scoreScalar("city", null, null).outcome).toBe("absent");
  });
  it("treats an empty string as null", () => {
    expect(scoreScalar("name", "", "").outcome).toBe("absent");
  });
});

describe("scoreSet", () => {
  it("matches regardless of order", () => {
    const scores = scoreSet("company", ["Acme", "Globex"], ["Globex", "Acme"]);
    expect(scores.every((s) => s.outcome === "correct")).toBe(true);
  });
  it("reports a missing entry", () => {
    const scores = scoreSet("company", ["Acme", "Globex"], ["Acme"]);
    expect(scores.filter((s) => s.outcome === "missed")).toHaveLength(1);
  });
  it("reports an extra entry as invented", () => {
    const scores = scoreSet("company", ["Acme"], ["Acme", "Initech"]);
    expect(scores.filter((s) => s.outcome === "invented")).toHaveLength(1);
  });
  it("handles duplicates without double counting", () => {
    const scores = scoreSet("skill", ["Go"], ["Go", "Go"]);
    expect(scores.filter((s) => s.outcome === "correct")).toHaveLength(1);
    expect(scores.filter((s) => s.outcome === "invented")).toHaveLength(1);
  });
});

describe("summarise", () => {
  it("computes accuracy over graded fields only", () => {
    const summary = summarise([
      { field: "a", outcome: "correct", expected: "x", actual: "x" },
      { field: "b", outcome: "wrong", expected: "y", actual: "z" },
      { field: "c", outcome: "absent", expected: null, actual: null },
    ]);
    expect(summary.graded).toBe(2);
    expect(summary.accuracy).toBe(0.5);
  });

  it("computes invention rate over attempted fields", () => {
    const summary = summarise([
      { field: "a", outcome: "correct", expected: "x", actual: "x" },
      { field: "b", outcome: "invented", expected: null, actual: "z" },
    ]);
    expect(summary.inventionRate).toBe(0.5);
  });

  it("returns zeroes for an empty run rather than dividing by zero", () => {
    const summary = summarise([]);
    expect(summary.accuracy).toBe(0);
    expect(summary.inventionRate).toBe(0);
  });
});
