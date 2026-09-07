import { extractDocx } from "../extract/docx.js";
import { extractPdf } from "../extract/pdf.js";
import type { Resume } from "../schema.js";
import { assemble, coverageOf } from "./index.js";

export type SourceKind = "pdf" | "docx" | "text";

export function detectKind(bytes: Uint8Array): SourceKind {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
    return "docx";
  }
  return "text";
}

export async function parseDocument(bytes: Uint8Array): Promise<Resume> {
  const started = performance.now();
  const kind = detectKind(bytes);
  let text: string;
  let pages: number;
  if (kind === "pdf") {
    const out = await extractPdf(bytes);
    text = out.text;
    pages = out.pages;
  } else if (kind === "docx") {
    const out = await extractDocx(bytes);
    text = out.text;
    pages = out.pages;
  } else {
    text = new TextDecoder().decode(bytes);
    pages = 1;
  }
  return finish(text, kind, pages, started);
}

export function parseText(text: string): Resume {
  const started = performance.now();
  return finish(text, "text", 1, started);
}

function finish(text: string, source: SourceKind, pages: number, started: number): Resume {
  const resume = assemble(text);
  return {
    ...resume,
    meta: {
      source,
      pages,
      characters: text.length,
      usedFallback: false,
      durationMs: Number((performance.now() - started).toFixed(2)),
      coverage: coverageOf(resume),
    },
  };
}
