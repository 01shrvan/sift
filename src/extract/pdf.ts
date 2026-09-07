import { getDocumentProxy } from "unpdf";
import { reconstruct, type Item } from "./layout.js";

export type Extracted = {
  text: string;
  pages: number;
};

type TextItem = {
  str?: unknown;
  transform?: unknown;
  width?: unknown;
};

function toItem(raw: TextItem): Item | null {
  if (typeof raw.str !== "string") return null;
  const t = raw.transform;
  if (!Array.isArray(t) || t.length < 6) return null;
  const x = t[4];
  const y = t[5];
  if (typeof x !== "number" || typeof y !== "number") return null;
  const width = typeof raw.width === "number" ? raw.width : raw.str.length * 5;
  return { str: raw.str, x, y, width };
}

export async function extractPdf(bytes: Uint8Array): Promise<Extracted> {
  const pdf = await getDocumentProxy(bytes);
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const items: Item[] = [];
    for (const raw of content.items as TextItem[]) {
      const item = toItem(raw);
      if (item !== null) items.push(item);
    }
    const viewport = page.getViewport({ scale: 1 });
    pages.push(reconstruct(items, viewport.width));
  }
  return { text: pages.join("\n\n").trim(), pages: pdf.numPages };
}
