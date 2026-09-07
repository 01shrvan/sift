const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const CENTRAL_FIXED_SIZE = 46;
const LOCAL_FIXED_SIZE = 30;

export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function findEndOfCentralDirectory(view: DataView): number {
  const limit = Math.max(0, view.byteLength - EOCD_MIN_SIZE - 0xffff);
  for (let i = view.byteLength - EOCD_MIN_SIZE; i >= limit; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

export function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) throw new Error("not a zip archive: no end of central directory");
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (offset + CENTRAL_FIXED_SIZE > bytes.byteLength) break;
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    entries.push({
      name: decoder.decode(bytes.subarray(offset + CENTRAL_FIXED_SIZE, offset + CENTRAL_FIXED_SIZE + nameLength)),
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      localOffset: view.getUint32(offset + 42, true),
    });
    offset += CENTRAL_FIXED_SIZE + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  void writer.write(input);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

export async function readZipEntry(bytes: Uint8Array, name: string): Promise<Uint8Array | null> {
  const entry = readCentralDirectory(bytes).find((e) => e.name === name);
  if (entry === undefined) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const local = entry.localOffset;
  if (view.getUint32(local, true) !== LOCAL_SIGNATURE) {
    throw new Error(`corrupt zip: bad local header for ${name}`);
  }
  const nameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  const start = local + LOCAL_FIXED_SIZE + nameLength + extraLength;
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRaw(data);
  throw new Error(`unsupported zip compression method ${entry.method} for ${name}`);
}
