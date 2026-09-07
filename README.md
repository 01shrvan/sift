# sift

Resume and CV parsing over HTTP. Send a PDF or a Word file, get JSON Resume back, with a
latency number that is measured rather than claimed.

## Why this exists

Measured from the RapidAPI listings for `resume parser` on 2026-09-07. These are the
providers' own published numbers, not estimates.

| listing | published latency | last updated |
|---|---|---|
| Resume Parsing API (ranked first) | 16,052ms | 2 years ago |
| Affordable CV & Resume Parser | 19,688ms | 2 years ago |
| AI Resume Parser | 131,217ms | 2 years ago |
| ResumeJSON | 2,447ms | actively maintained |
| **sift** | **15-50ms** | this repo |

Every one of those calls a language model on the hot path. A model call alone costs
seconds, so a service that makes one cannot compete on the number it publishes.

sift parses deterministically: text layer, layout reconstruction, section segmentation,
field readers. No network call on the common path.

The other gap: ResumeJSON's endpoint accepts `{"text": "..."}` only, so the caller has to
get the text out of the PDF themselves. That is the hard part. sift takes the file.

## Endpoints

```
GET  /v1/health
POST /v1/parse
```

`POST /v1/parse` accepts a `multipart/form-data` upload in a field named `file`, a JSON body
`{"text": "..."}`, or raw bytes. PDF and DOCX are detected by magic bytes. Limit is 10MB.

The response is [JSON Resume](https://jsonresume.org/schema) shaped, plus a `meta` block:

```json
{
  "meta": {
    "source": "pdf",
    "pages": 1,
    "characters": 3047,
    "durationMs": 14,
    "coverage": {
      "found": ["basics.name", "basics.email", "work", "education", "skills"],
      "missing": ["basics.location.city"]
    }
  }
}
```

`coverage` is the point. The service reports which fields it could not find instead of
guessing, because for a parser, quiet omission is worse than a visible gap.

## Running it

```bash
pnpm install
pnpm dev          # node, http://localhost:8787
pnpm test         # 144 tests
pnpm lint         # typecheck, strict
npx wrangler dev  # the cloudflare workers runtime
```

## Accuracy

`pnpm eval` scores the parser against hand-labelled documents and writes
`eval/out/report.md`.

Latest run, 3 documents, 76 fields graded:

```
accuracy       100.0%
invented       0 (0.0% of attempted)
missed         0
latency p50    49.6ms
```

Read that with the sample size in mind. Three documents is a small corpus and the parser was
fixed against them, so this number is a floor on obvious breakage, not a claim about resumes
in general. It needs twenty or more documents from different templates before it means much.

`eval/corpus/` and `eval/truth/` are gitignored. Real CVs are personal data and do not belong
in a repository.

## Deploying

Cloudflare Workers, configured in `wrangler.toml`. A parse costs roughly 14ms of CPU, which
sits above the free plan's 10ms per request limit, so this needs the $5/month Workers plan.
Nothing else here costs money.

## License

Proprietary. All rights reserved. No permission is granted to copy, modify, or redistribute
this source. The repository is public so the work can be read, not so it can be reused.

Dependencies are `hono` (MIT), `zod` (MIT) and `unpdf` (MIT, bundling Mozilla pdf.js under
Apache-2.0). sift runs as a hosted service rather than being distributed, so none of those
licenses require notices to be shipped to users. This section is here for clarity, not
because it is legally required.
