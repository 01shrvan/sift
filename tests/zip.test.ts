import { describe, expect, it } from "vitest";
import { extractDocx } from "../src/extract/docx.js";
import { readCentralDirectory, readZipEntry } from "../src/extract/zip.js";

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

async function makeZip(name: string, content: string, method: 0 | 8): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const raw = encoder.encode(content);
  const data = method === 8 ? await deflateRaw(raw) : raw;

  const local = new Uint8Array(30 + nameBytes.length + data.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(8, method, true);
  localView.setUint32(18, data.length, true);
  localView.setUint32(22, raw.length, true);
  localView.setUint16(26, nameBytes.length, true);
  localView.setUint16(28, 0, true);
  local.set(nameBytes, 30);
  local.set(data, 30 + nameBytes.length);

  const central = new Uint8Array(46 + nameBytes.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(10, method, true);
  centralView.setUint32(20, data.length, true);
  centralView.setUint32(24, raw.length, true);
  centralView.setUint16(28, nameBytes.length, true);
  centralView.setUint32(42, 0, true);
  central.set(nameBytes, 46);

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, 1, true);
  eocdView.setUint16(10, 1, true);
  eocdView.setUint32(12, central.length, true);
  eocdView.setUint32(16, local.length, true);

  const out = new Uint8Array(local.length + central.length + eocd.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(eocd, local.length + central.length);
  return out;
}

describe("readCentralDirectory", () => {
  it("lists a stored entry", async () => {
    const zip = await makeZip("word/document.xml", "<w:p/>", 0);
    const entries = readCentralDirectory(zip);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.name).toBe("word/document.xml");
    expect(entries[0]!.method).toBe(0);
  });

  it("throws on bytes that are not a zip", () => {
    expect(() => readCentralDirectory(new TextEncoder().encode("not a zip at all"))).toThrow(
      /not a zip archive/,
    );
  });
});

describe("readZipEntry", () => {
  it("reads a stored entry", async () => {
    const zip = await makeZip("word/document.xml", "stored content", 0);
    const out = await readZipEntry(zip, "word/document.xml");
    expect(new TextDecoder().decode(out!)).toBe("stored content");
  });

  it("inflates a deflated entry", async () => {
    const content = "deflated content ".repeat(50);
    const zip = await makeZip("word/document.xml", content, 8);
    const out = await readZipEntry(zip, "word/document.xml");
    expect(new TextDecoder().decode(out!)).toBe(content);
  });

  it("returns null for a missing entry", async () => {
    const zip = await makeZip("word/document.xml", "x", 0);
    expect(await readZipEntry(zip, "word/styles.xml")).toBeNull();
  });
});

describe("extractDocx", () => {
  it("reads text out of a real zip container", async () => {
    const xml =
      "<w:document><w:body>" +
      "<w:p><w:r><w:t>Jane Doe</w:t></w:r></w:p>" +
      "<w:p><w:r><w:t>Senior </w:t></w:r><w:r><w:t>Engineer</w:t></w:r></w:p>" +
      "</w:body></w:document>";
    const zip = await makeZip("word/document.xml", xml, 8);
    const out = await extractDocx(zip);
    expect(out.text).toBe("Jane Doe\nSenior Engineer");
    expect(out.pages).toBe(1);
  });

  it("rejects a zip without a word document", async () => {
    const zip = await makeZip("other.xml", "<x/>", 0);
    await expect(extractDocx(zip)).rejects.toThrow(/word\/document\.xml is missing/);
  });
});
