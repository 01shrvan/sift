import { Hono } from "hono";
import { parseDocument, parseText } from "./parse/document.js";

const MAX_BYTES = 10 * 1024 * 1024;

export const app = new Hono();

const INDEX_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>sift</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; padding:3rem 1.5rem; background:#0b0b0c; color:#e6e6e6;
         font:15px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace }
  main { max-width:46rem; margin:0 auto }
  h1 { font-size:1.6rem; margin:0 0 .4rem; letter-spacing:-.02em }
  p { color:#a0a0a5; margin:0 0 2rem }
  code, pre { background:#161618; border:1px solid #26262a; border-radius:4px }
  code { padding:.12rem .35rem }
  pre { padding:1rem; overflow-x:auto; margin:.5rem 0 1.5rem }
  .row { display:flex; gap:.75rem; align-items:baseline; margin:.35rem 0 }
  .m { color:#7fd1a3; min-width:3.2rem }
  a { color:#7fb4d1 }
</style>
<main>
  <h1>sift</h1>
  <p>Resume and CV parsing. Send a PDF or a Word file, get JSON Resume back.</p>
  <div class="row"><span class="m">GET</span><code>/v1/health</code></div>
  <div class="row"><span class="m">POST</span><code>/v1/parse</code></div>
  <pre>curl -X POST __BASE__/v1/parse \
  -F "file=@resume.pdf"</pre>
  <p>Accepts multipart <code>file</code>, JSON <code>{"text":"..."}</code>, or raw bytes.
  Up to 10MB. Every response carries a <code>coverage</code> block naming the fields it
  could not find, rather than guessing.</p>
  <p><a href="https://github.com/01shrvan/sift">github.com/01shrvan/sift</a></p>
</main>`;

app.get("/", (c) => {
  const base = new URL(c.req.url).origin;
  if ((c.req.header("accept") ?? "").includes("text/html")) {
    return c.html(INDEX_HTML.replace("__BASE__", base));
  }
  return c.json({
    name: "sift",
    description: "Resume and CV parsing. PDF or DOCX in, JSON Resume out.",
    endpoints: {
      health: { method: "GET", path: "/v1/health" },
      parse: { method: "POST", path: "/v1/parse" },
    },
    source: "https://github.com/01shrvan/sift",
  });
});

app.get("/v1/health", (c) => c.json({ status: "ok" }));
app.get("/ping", (c) => c.json({ status: "ok" }));

app.post("/v1/parse", async (c) => {
  const started = performance.now();
  const contentType = c.req.header("content-type") ?? "";

  try {
    let resume;
    if (contentType.includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) {
        return c.json({ error: "expected a file field named 'file'" }, 400);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length === 0) return c.json({ error: "the uploaded file is empty" }, 400);
      if (bytes.length > MAX_BYTES) return c.json({ error: "file exceeds 10MB" }, 413);
      resume = await parseDocument(bytes);
    } else if (contentType.includes("application/json")) {
      const body = (await c.req.json()) as { text?: unknown };
      if (typeof body.text !== "string" || body.text.trim().length === 0) {
        return c.json({ error: "expected a non-empty 'text' field" }, 400);
      }
      resume = parseText(body.text);
    } else {
      const buffer = await c.req.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.length === 0) return c.json({ error: "empty request body" }, 400);
      if (bytes.length > MAX_BYTES) return c.json({ error: "file exceeds 10MB" }, 413);
      resume = await parseDocument(bytes);
    }

    c.header("x-response-time", `${(performance.now() - started).toFixed(2)}ms`);
    c.header("x-parse-time", `${resume.meta.durationMs}ms`);
    return c.json(resume);
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not read the document";
    return c.json({ error: message }, 422);
  }
});

export const handler = {
  fetch(request: Request): Response | Promise<Response> {
    const url = new URL(request.url);
    if (!/\/{2,}/.test(url.pathname)) return app.fetch(request);
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    return app.fetch(new Request(url.toString(), request));
  },
};

export default handler;
