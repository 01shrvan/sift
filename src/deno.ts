import app from "./app.js";

const port = Number(Deno.env.get("PORT") ?? 8787);
Deno.serve({ port }, app.fetch);
