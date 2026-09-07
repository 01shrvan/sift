import { describe, expect, it } from "vitest";
import { findAddressLocation, findLocation } from "../src/parse/location.js";

describe("findLocation", () => {
  it("reads city and country", () => {
    expect(findLocation(["Mumbai, India"])).toEqual({
      city: "Mumbai",
      region: null,
      countryCode: "IN",
    });
  });

  it("reads city, state and country", () => {
    expect(findLocation(["Pune, Maharashtra, India"])).toEqual({
      city: "Pune",
      region: "Maharashtra",
      countryCode: "IN",
    });
  });

  it("reads an indian state without a country", () => {
    expect(findLocation(["Bengaluru, Karnataka"])).toEqual({
      city: "Bengaluru",
      region: "Karnataka",
      countryCode: "IN",
    });
  });

  it("reads a us state code", () => {
    expect(findLocation(["San Francisco, CA"])).toEqual({
      city: "San Francisco",
      region: "CA",
      countryCode: "US",
    });
  });

  it("finds a location inside a piped contact line", () => {
    expect(findLocation(["shrvan@example.com | +91 84519 74359 | Mumbai, India"])).toEqual({
      city: "Mumbai",
      region: null,
      countryCode: "IN",
    });
  });

  it("ignores a company with a corporate suffix", () => {
    expect(findLocation(["Acme, Inc."])).toBeNull();
  });

  it("ignores an address with digits", () => {
    expect(findLocation(["12 Marine Drive, Mumbai, India"])).toBeNull();
  });

  it("ignores a url", () => {
    expect(findLocation(["linkedin.com/in/shrvan, India"])).toBeNull();
  });

  it("returns null when there is no location", () => {
    expect(findLocation(["Shrvan Benke", "Backend Engineer"])).toBeNull();
  });

  it("handles uk phrasing", () => {
    expect(findLocation(["London, United Kingdom"])).toEqual({
      city: "London",
      region: null,
      countryCode: "GB",
    });
  });
});

describe("findAddressLocation", () => {
  it("reads the city out of a us street address", () => {
    expect(findAddressLocation(["2002 Front Range Way Fort Collins, CO 80525"])).toEqual({
      city: "Fort Collins",
      region: "CO",
      countryCode: "US",
    });
  });

  it("drops a street suffix that leaks into the city", () => {
    expect(findAddressLocation(["500 Market St San Francisco, CA 94102"])).toEqual({
      city: "San Francisco",
      region: "CA",
      countryCode: "US",
    });
  });

  it("ignores a two letter token that is not a state", () => {
    expect(findAddressLocation(["12 Some Road Placeville, ZZ 12345"])).toBeNull();
  });

  it("returns null without an address", () => {
    expect(findAddressLocation(["Shrvan Benke", "Backend Engineer"])).toBeNull();
  });
});
