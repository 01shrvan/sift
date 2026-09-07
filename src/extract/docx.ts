import type { Extracted } from "./pdf.js";
import { readZipEntry } from "./zip.js";

const PARAGRAPH = /<w:p[ >][\s\S]*?<\/w:p>/g;
const NODE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(?:br|cr)\s*\/>|<w:tab\s*\/>/g;

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

export function documentXmlToText(xml: string): string {
  const lines: string[] = [];
  const paragraphs = xml.match(PARAGRAPH) ?? [];
  for (const paragraph of paragraphs) {
    let line = "";
    for (const node of paragraph.matchAll(NODE)) {
      const text = node[1];
      if (text !== undefined) line += decodeEntities(text);
      else if (node[0].startsWith("<w:tab")) line += "\t";
      else line += "\n";
    }
    for (const part of line.split("\n")) {
      const trimmed = part.replace(/[ \t]+/g, " ").trim();
      if (trimmed.length > 0) lines.push(trimmed);
    }
  }
  return lines.join("\n");
}

export async function extractDocx(bytes: Uint8Array): Promise<Extracted> {
  const entry = await readZipEntry(bytes, "word/document.xml");
  if (entry === null) throw new Error("not a docx: word/document.xml is missing");
  const xml = new TextDecoder().decode(entry);
  return { text: documentXmlToText(xml), pages: 1 };
}
