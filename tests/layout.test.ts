import { describe, expect, it } from "vitest";
import { findColumnSplit, reconstruct, type Item } from "../src/extract/layout.js";

function item(str: string, x: number, y: number, width = str.length * 5): Item {
  return { str, x, y, width };
}

describe("reconstruct", () => {
  it("orders a single column top to bottom", () => {
    const items = [item("second", 50, 700), item("first", 50, 720), item("third", 50, 680)];
    expect(reconstruct(items, 612)).toBe("first\nsecond\nthird");
  });

  it("joins items sharing a baseline into one line", () => {
    const items = [item("Jane", 50, 700, 30), item("Doe", 85, 700, 25)];
    expect(reconstruct(items, 612)).toBe("Jane Doe");
  });

  it("tolerates small baseline drift within a line", () => {
    const items = [item("Senior", 50, 700, 40), item("Engineer", 95, 702, 50)];
    expect(reconstruct(items, 612)).toBe("Senior Engineer");
  });

  it("drops empty items", () => {
    const items = [item("  ", 50, 700, 5), item("real", 50, 680, 20)];
    expect(reconstruct(items, 612)).toBe("real");
  });

  it("returns empty string for no usable items", () => {
    expect(reconstruct([], 612)).toBe("");
  });
});

describe("findColumnSplit", () => {
  it("returns null for a single column page", () => {
    const items = Array.from({ length: 40 }, (_, i) => item(`line ${i}`, 50, 700 - i * 12, 200));
    expect(findColumnSplit(items, 612)).toBeNull();
  });

  it("returns null when there are too few items to judge", () => {
    const items = [item("a", 40, 700, 20), item("b", 400, 700, 20)];
    expect(findColumnSplit(items, 612)).toBeNull();
  });

  it("detects a two column layout", () => {
    const left = Array.from({ length: 20 }, (_, i) => item(`L${i}`, 40, 700 - i * 12, 150));
    const right = Array.from({ length: 20 }, (_, i) => item(`R${i}`, 340, 700 - i * 12, 150));
    const split = findColumnSplit([...left, ...right], 612);
    expect(split).not.toBeNull();
    expect(split!).toBeGreaterThan(190);
    expect(split!).toBeLessThan(340);
  });
});

describe("reconstruct with columns", () => {
  it("reads the left column fully before the right", () => {
    const left = Array.from({ length: 20 }, (_, i) => item(`L${i}`, 40, 700 - i * 12, 150));
    const right = Array.from({ length: 20 }, (_, i) => item(`R${i}`, 340, 700 - i * 12, 150));
    const lines = reconstruct([...left, ...right], 612).split("\n");
    expect(lines[0]).toBe("L0");
    expect(lines[19]).toBe("L19");
    expect(lines[20]).toBe("R0");
    expect(lines[39]).toBe("R19");
  });
});
