export type Item = {
  str: string;
  x: number;
  y: number;
  width: number;
};

const LINE_TOLERANCE = 3;
const MIN_COLUMN_SHARE = 0.15;
const MAX_STRADDLE_SHARE = 0.02;

const WIDE_GAP_SHARE = 0.025;

function groupIntoLines(items: Item[], pageWidth: number): string[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const lines: Item[][] = [];
  let current: Item[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]!;
    const anchor = current[0]!;
    if (Math.abs(item.y - anchor.y) <= LINE_TOLERANCE) {
      current.push(item);
    } else {
      lines.push(current);
      current = [item];
    }
  }
  lines.push(current);
  const wideGap = pageWidth > 0 ? pageWidth * WIDE_GAP_SHARE : Infinity;
  return lines.map((line) => {
    const ordered = [...line].sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd: number | null = null;
    for (const item of ordered) {
      if (prevEnd !== null) {
        const gap = item.x - prevEnd;
        if (gap > wideGap) text += "\t";
        else if (gap > 1 && !text.endsWith(" ")) text += " ";
      }
      text += item.str;
      prevEnd = item.x + item.width;
    }
    return text.replace(/[ ]{2,}/g, " ").replace(/\t+/g, "\t").trim();
  });
}

export function findColumnSplit(items: Item[], pageWidth: number): number | null {
  if (items.length < 20 || pageWidth <= 0) return null;
  let best: { split: number; straddle: number; balance: number } | null = null;
  for (let f = 0.3; f <= 0.7; f += 0.02) {
    const split = pageWidth * f;
    let left = 0;
    let right = 0;
    let straddle = 0;
    for (const item of items) {
      const end = item.x + item.width;
      if (end <= split) left++;
      else if (item.x >= split) right++;
      else straddle++;
    }
    const total = items.length;
    if (straddle / total > MAX_STRADDLE_SHARE) continue;
    if (left / total < MIN_COLUMN_SHARE || right / total < MIN_COLUMN_SHARE) continue;
    const balance = Math.abs(left - right) / total;
    if (best === null || straddle < best.straddle || (straddle === best.straddle && balance < best.balance)) {
      best = { split, straddle, balance };
    }
  }
  return best === null ? null : best.split;
}

export function reconstruct(items: Item[], pageWidth: number): string {
  const usable = items.filter((i) => i.str.trim().length > 0);
  if (usable.length === 0) return "";
  const split = findColumnSplit(usable, pageWidth);
  if (split === null) return groupIntoLines(usable, pageWidth).join("\n");
  const left = usable.filter((i) => i.x + i.width <= split);
  const right = usable.filter((i) => i.x + i.width > split);
  return [...groupIntoLines(left, pageWidth), ...groupIntoLines(right, pageWidth)].join("\n");
}
