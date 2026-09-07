export type Outcome = "correct" | "wrong" | "missed" | "invented" | "absent";

export type FieldScore = {
  field: string;
  outcome: Outcome;
  expected: string | null;
  actual: string | null;
};

export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,;:'"()\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreScalar(field: string, expected: unknown, actual: unknown): FieldScore {
  const e = typeof expected === "string" && expected.length > 0 ? expected : null;
  const a = typeof actual === "string" && actual.length > 0 ? actual : null;
  if (e === null && a === null) return { field, outcome: "absent", expected: null, actual: null };
  if (e === null) return { field, outcome: "invented", expected: null, actual: a };
  if (a === null) return { field, outcome: "missed", expected: e, actual: null };
  const outcome: Outcome = normalise(e) === normalise(a) ? "correct" : "wrong";
  return { field, outcome, expected: e, actual: a };
}

export function scoreSet(field: string, expected: string[], actual: string[]): FieldScore[] {
  const wanted = expected.map(normalise).filter((v) => v.length > 0);
  const got = actual.map(normalise).filter((v) => v.length > 0);
  const remaining = [...got];
  const scores: FieldScore[] = [];
  for (let i = 0; i < wanted.length; i++) {
    const idx = remaining.indexOf(wanted[i]!);
    if (idx >= 0) {
      remaining.splice(idx, 1);
      scores.push({ field, outcome: "correct", expected: expected[i]!, actual: expected[i]! });
    } else {
      scores.push({ field, outcome: "missed", expected: expected[i]!, actual: null });
    }
  }
  for (const extra of remaining) {
    scores.push({ field, outcome: "invented", expected: null, actual: extra });
  }
  return scores;
}

export type Summary = {
  correct: number;
  wrong: number;
  missed: number;
  invented: number;
  absent: number;
  graded: number;
  accuracy: number;
  inventionRate: number;
};

export function summarise(scores: FieldScore[]): Summary {
  const tally: Record<Outcome, number> = {
    correct: 0,
    wrong: 0,
    missed: 0,
    invented: 0,
    absent: 0,
  };
  for (const score of scores) tally[score.outcome] += 1;
  const graded = tally.correct + tally.wrong + tally.missed;
  const attempted = tally.correct + tally.wrong + tally.invented;
  return {
    ...tally,
    graded,
    accuracy: graded === 0 ? 0 : tally.correct / graded,
    inventionRate: attempted === 0 ? 0 : tally.invented / attempted,
  };
}
