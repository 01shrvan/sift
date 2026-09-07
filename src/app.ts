import { Hono } from "hono";
import { parseDocument, parseText } from "./parse/document.js";

const MAX_BYTES = 10 * 1024 * 1024;

export const app = new Hono();

app.get("/v1/health", (c) => c.json({ status: "ok" }));

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
    return c.json(resume);
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not read the document";
    return c.json({ error: message }, 422);
  }
});

export default app;
