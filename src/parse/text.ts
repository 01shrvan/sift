export function normaliseLetterSpacing(line: string): string {
  const parts = line.split(" ");
  if (parts.length < 4) return line;
  const singles = parts.filter((p) => p.length === 1).length;
  if (singles / parts.length < 0.7) return line;
  const out: string[] = [];
  let buffer = "";
  for (const part of parts) {
    if (part.length === 1) {
      buffer += part;
    } else {
      if (buffer.length > 0) {
        out.push(buffer);
        buffer = "";
      }
      out.push(part);
    }
  }
  if (buffer.length > 0) out.push(buffer);
  return out.join(" ");
}

export function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => normaliseLetterSpacing(l.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim()))
    .filter((l) => l.length > 0);
}

export function stripBullet(line: string): string {
  return line.replace(/^[•‣▪●◦⁃∙*\-–—]\s*/, "").trim();
}

export function isBullet(line: string): boolean {
  return /^[•‣▪●◦⁃∙*\-–—]\s+/.test(line);
}
