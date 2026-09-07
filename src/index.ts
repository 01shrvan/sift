import app from "./app.js";

const port = Number(globalThis.process?.env?.["PORT"] ?? 8787);

declare const Deno: { serve: (o: { port: number }, h: unknown) => unknown } | undefined;

if (typeof Deno !== "undefined") {
  Deno.serve({ port }, app.fetch);
} else {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port });
  process.stdout.write(`sift listening on http://localhost:${port}\n`);
}

export default app;
