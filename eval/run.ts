import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parseDocument } from "../src/parse/document.js";
import type { Resume } from "../src/schema.js";
import { scoreScalar, scoreSet, summarise, type FieldScore } from "./score.js";

const CORPUS = join(process.cwd(), "eval", "corpus");
const TRUTH = join(process.cwd(), "eval", "truth");

type Truth = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  companies?: string[];
  institutions?: string[];
  skills?: string[];
};

function scoreOne(resume: Resume, truth: Truth): FieldScore[] {
  const scores: FieldScore[] = [
    scoreScalar("name", truth.name, resume.basics.name),
    scoreScalar("email", truth.email, resume.basics.email),
    scoreScalar("phone", truth.phone, resume.basics.phone),
    scoreScalar("city", truth.city, resume.basics.location.city),
  ];
  if (truth.companies !== undefined) {
    const actual = resume.work.map((w) => w.name).filter((n): n is string => n !== null);
    scores.push(...scoreSet("company", truth.companies, actual));
  }
  if (truth.institutions !== undefined) {
    const actual = resume.education
      .map((e) => e.institution)
      .filter((n): n is string => n !== null);
    scores.push(...scoreSet("institution", truth.institutions, actual));
  }
  if (truth.skills !== undefined) {
    const actual = resume.skills.flatMap((s) => (s.keywords.length > 0 ? s.keywords : [s.name]));
    scores.push(...scoreSet("skill", truth.skills, actual));
  }
  return scores;
}

async function listCorpus(): Promise<string[]> {
  try {
    const files = await readdir(CORPUS);
    return files.filter((f) => [".pdf", ".docx", ".txt"].includes(extname(f).toLowerCase()));
  } catch {
    return [];
  }
}

async function loadTruth(stem: string): Promise<Truth | null> {
  try {
    return JSON.parse(await readFile(join(TRUTH, `${stem}.json`), "utf8")) as Truth;
  } catch {
    return null;
  }
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const files = await listCorpus();
  if (files.length === 0) {
    process.stdout.write(
      "no corpus found.\n" +
        `put resumes in ${CORPUS} and a matching <stem>.json in ${TRUTH}\n` +
        "both directories are gitignored because real cvs are personal data.\n",
    );
    process.exitCode = 1;
    return;
  }

  const all: FieldScore[] = [];
  const timings: number[] = [];
  const rows: string[] = [];
  let ungraded = 0;

  for (const file of files) {
    const stem = basename(file, extname(file));
    const bytes = new Uint8Array(await readFile(join(CORPUS, file)));
    const started = performance.now();
    const resume = await parseDocument(bytes);
    timings.push(performance.now() - started);

    const truth = await loadTruth(stem);
    if (truth === null) {
      ungraded += 1;
      rows.push(`${stem.padEnd(28)} ungraded (no truth file)`);
      continue;
    }
    const scores = scoreOne(resume, truth);
    all.push(...scores);
    const s = summarise(scores);
    rows.push(
      `${stem.padEnd(28)} ${pct(s.accuracy).padStart(6)}  ` +
        `correct ${s.correct} wrong ${s.wrong} missed ${s.missed} invented ${s.invented}`,
    );
    for (const score of scores) {
      if (score.outcome === "correct" || score.outcome === "absent") continue;
      const detail =
        score.outcome === "missed"
          ? `wanted ${JSON.stringify(score.expected)}`
          : score.outcome === "invented"
            ? `got ${JSON.stringify(score.actual)}`
            : `wanted ${JSON.stringify(score.expected)} got ${JSON.stringify(score.actual)}`;
      rows.push(`    ${score.outcome.padEnd(9)} ${score.field.padEnd(12)} ${detail}`);
    }
  }

  timings.sort((a, b) => a - b);
  const p50 = timings[Math.floor(timings.length * 0.5)] ?? 0;
  const p99 = timings[Math.min(timings.length - 1, Math.floor(timings.length * 0.99))] ?? 0;

  process.stdout.write(`${rows.join("\n")}\n\n`);
  if (all.length === 0) {
    process.stdout.write(`${files.length} documents parsed, none graded. Write truth files.\n`);
    process.exitCode = 1;
    return;
  }
  const total = summarise(all);
  const summary =
    `documents      ${files.length} (${ungraded} ungraded)\n` +
    `fields graded  ${total.graded}\n` +
    `accuracy       ${pct(total.accuracy)}\n` +
    `invented       ${total.invented} (${pct(total.inventionRate)} of attempted)\n` +
    `missed         ${total.missed}\n` +
    `latency p50    ${p50.toFixed(1)}ms\n` +
    `latency p99    ${p99.toFixed(1)}ms\n`;
  process.stdout.write(summary);

  const out = join(process.cwd(), "eval", "out");
  await mkdir(out, { recursive: true });
  const report =
    `# sift eval | ${new Date().toISOString()}\n\n` +
    "```\n" + rows.join("\n") + "\n```\n\n" +
    "```\n" + summary + "```\n";
  await writeFile(join(out, "report.md"), report, "utf8");
  process.stdout.write(`\nreport written to eval/out/report.md\n`);
}

await main();
