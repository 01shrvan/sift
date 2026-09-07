import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractPdf } from "../src/extract/pdf.js";

const FIXTURE = "eval/corpus/sample2.pdf";

describe.skipIf(!existsSync(FIXTURE))("extractPdf buffer safety", () => {
  it("does not detach the caller's buffer", async () => {
    const bytes = new Uint8Array(await readFile(FIXTURE));
    await extractPdf(bytes);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("returns the same text when the same buffer is parsed twice", async () => {
    const bytes = new Uint8Array(await readFile(FIXTURE));
    const first = await extractPdf(bytes);
    const second = await extractPdf(bytes);
    expect(first.text.length).toBeGreaterThan(0);
    expect(second.text).toBe(first.text);
  });
});
