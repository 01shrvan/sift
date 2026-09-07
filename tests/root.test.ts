import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("root route", () => {
  it("serves json to api clients", async () => {
    const res = await app.request("/", { headers: { accept: "application/json" } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; endpoints: Record<string, unknown> };
    expect(body.name).toBe("sift");
    expect(Object.keys(body.endpoints)).toEqual(["health", "parse"]);
  });

  it("serves html to browsers", async () => {
    const res = await app.request("/", { headers: { accept: "text/html" } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>sift</title>");
    expect(html).toContain("/v1/parse");
  });

  it("substitutes the real origin into the curl example", async () => {
    const res = await app.request("http://localhost:8787/", { headers: { accept: "text/html" } });
    const html = await res.text();
    expect(html).not.toContain("__BASE__");
    expect(html).toContain("curl -X POST http://localhost:8787/v1/parse");
  });

  it("still 404s an unknown path", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
  });
});
