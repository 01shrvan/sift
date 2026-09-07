# RapidAPI listing pack

Everything to paste when publishing. Listing is web only, there is no CLI for it.

## Before you list

Done. Live at **https://sift.astra.deno.net** on Deno Deploy's free tier, and
`openapi.yaml` already points at it.

Verified from outside on 2026-09-07: `/v1/health` returns ok, and a real PDF parses correctly
in **22.5ms** of server time. Total round trip from India is ~1.2s, almost all of it TLS and
upload to a US free region. RapidAPI probes from their own infrastructure, so the latency they
publish will track the 22ms, not the 1.2s.

## Name

```
sift | Resume & CV Parser
```

## Short description

```
Send a PDF or Word CV, get JSON Resume back in under 50ms. No model call, so the latency is
the product.
```

## Category

`Jobs`, same as ResumeJSON.

## Tags

```
resume, cv, parser, resume parser, cv parser, json resume, ats, recruiting, hiring, pdf, docx
```

## Long description

```markdown
sift turns a resume file into structured JSON.

Send a PDF or a DOCX. Get back name, email, phone, location, profiles, work history,
education, skills, projects, certificates and languages, in the JSON Resume shape.

**It takes the file.** Most parsers on this marketplace accept plain text only, which leaves
you to pull the text out of the PDF first. That is the hard part, and it is the part that
breaks on two-column layouts and Word tables. sift does it for you.

**It is fast because it does not call a model.** Parsing is deterministic: text layer, layout
reconstruction, section segmentation, field readers. A model call costs seconds on its own, so
any parser that makes one cannot compete on latency. Measured 15 to 50 ms per document,
depending on runtime.

**It tells you what it could not find.** Every response carries a `coverage` block listing the
fields that were found and the fields that were missing. A parser that quietly returns a wrong
name is worse than one that returns null and says so.

## Endpoints

`POST /v1/parse` takes a `multipart/form-data` upload in a field named `file`, or a JSON body
`{"text": "..."}` if you already have the text. PDF and DOCX are detected automatically.
Limit is 10MB.

`GET /v1/health` for liveness.

## Example response

{
  "basics": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+91 98765 43210",
    "location": { "city": "Mumbai", "region": null, "countryCode": "IN" },
    "profiles": [
      { "network": "GitHub", "username": "janedoe", "url": "https://github.com/janedoe" }
    ]
  },
  "work": [
    {
      "name": "Acme Corp",
      "position": "Senior Engineer",
      "startDate": "2022-01",
      "endDate": "present",
      "highlights": ["Cut p99 latency from 380ms to 42ms"]
    }
  ],
  "meta": {
    "source": "pdf",
    "durationMs": 14,
    "coverage": {
      "found": ["basics.name", "basics.email", "work", "education", "skills"],
      "missing": ["basics.location.city"]
    }
  }
}

Scanned image-only PDFs are not supported yet. Those need OCR, and adding it to the hot path
would break the latency this API is built on.
```

## Pricing

Set against what the incumbents actually charge, read off their pricing pages 2026-09-07:
Extracta is $120/mo for 1,000 parses, ResumeJSON is $29/mo for 1,000 and $99/mo for 5,000.

Marginal cost here is near zero, so the free tier is deliberately generous. Getting tried is
the whole problem for a listing nobody has heard of.

| plan | price | requests | overage |
|---|---|---|---|
| Basic | $0 | 100 / month | hard limit |
| Pro | $19 / month | 2,000 | $0.008 |
| Ultra | $59 / month | 10,000 | $0.005 |
| Mega | $179 / month | 50,000 | $0.003 |

Basic is 4x ResumeJSON's 25 free calls. Pro is 2x their volume at a third less money.

## What not to claim

Do not put an accuracy number on this listing yet. The eval corpus is three documents and the
parser was fixed against them, so 100% means "no obvious breakage on three templates". Grow
`eval/corpus/` past twenty and re-run `pnpm eval` before any accuracy claim goes public.

The latency numbers are safe to publish. They were measured on three runtimes against real
PDFs, and RapidAPI will publish its own measured latency on the listing anyway.

## Publishing steps

1. rapid.api.com → sign in → **My APIs** → **Add New API**
2. Choose **OpenAPI** and upload `openapi.yaml`. Endpoints and schemas fill in automatically.
3. Settings → paste the name, short description, category and tags above.
4. Long description → paste the markdown block above.
5. Pricing → create the four plans in the table.
6. Publish, then subscribe on your own Basic plan and call it once to confirm the proxy works.
