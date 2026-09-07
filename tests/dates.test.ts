import { describe, expect, it } from "vitest";
import { findDateRange, hasDateRange, normaliseDate, stripDateRange } from "../src/parse/dates.js";

describe("normaliseDate", () => {
  it("reads a full month name", () => expect(normaliseDate("January 2020")).toBe("2020-01"));
  it("reads an abbreviated month with a dot", () => expect(normaliseDate("Sept. 2019")).toBe("2019-09"));
  it("reads a two digit year", () => expect(normaliseDate("Mar '21")).toBe("2021-03"));
  it("reads a numeric month and year", () => expect(normaliseDate("03/2020")).toBe("2020-03"));
  it("reads a bare year", () => expect(normaliseDate("2018")).toBe("2018"));
  it("maps present onto a sentinel", () => expect(normaliseDate("Present")).toBe("present"));
  it("maps till date onto the same sentinel", () => expect(normaliseDate("till date")).toBe("present"));
  it("rejects an impossible month", () => expect(normaliseDate("13/2020")).toBeNull());
  it("rejects prose", () => expect(normaliseDate("sometime last year")).toBeNull());
});

describe("findDateRange", () => {
  it("reads a month range with an en dash", () => {
    expect(findDateRange("Acme, Engineer, Jan 2020 – Mar 2023")).toEqual({
      startDate: "2020-01",
      endDate: "2023-03",
    });
  });
  it("reads an open ended range", () => {
    expect(findDateRange("Senior Engineer, June 2021 - Present")).toEqual({
      startDate: "2021-06",
      endDate: "present",
    });
  });
  it("reads a bare year range", () => {
    expect(findDateRange("B.Tech 2017-2021")).toEqual({ startDate: "2017", endDate: "2021" });
  });
  it("reads the word to as a separator", () => {
    expect(findDateRange("2019 to 2022")).toEqual({ startDate: "2019", endDate: "2022" });
  });
  it("returns null when there is no range", () => {
    expect(findDateRange("Led the payments team")).toBeNull();
  });
});

describe("stripDateRange", () => {
  it("removes the range and tidy separators", () => {
    expect(stripDateRange("Acme — Senior Engineer | Jan 2020 – Mar 2023")).toBe("Acme — Senior Engineer");
  });
  it("leaves a line without a range alone", () => {
    expect(stripDateRange("Acme — Senior Engineer")).toBe("Acme — Senior Engineer");
  });
});

describe("hasDateRange", () => {
  it("is true for a range", () => expect(hasDateRange("2020 - 2023")).toBe(true));
  it("is false for a single year", () => expect(hasDateRange("Graduated 2020")).toBe(false));
});
