import { describe, expect, it } from "vitest";
import handler, { app } from "../src/app.js";

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

  it("answers the default health check path", async () => {
    const res = await app.request("/ping");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("still 404s an unknown path", async () => {
    const res = await app.request("/nope");
    expect(res.status).toBe(404);
  });
});

describe("slash normalisation", () => {
  it("routes a double slash path", async () => {
    const res = await handler.fetch(new Request("http://localhost/v1/health".replace("/v1", "//v1")));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("collapses several slashes", async () => {
    const res = await handler.fetch(new Request("http://localhost///v1///health"));
    expect(res.status).toBe(200);
  });

  it("preserves a normal path", async () => {
    const res = await handler.fetch(new Request("http://localhost/v1/health"));
    expect(res.status).toBe(200);
  });

  it("keeps 404 for a genuinely unknown path", async () => {
    const res = await handler.fetch(new Request("http://localhost//nope"));
    expect(res.status).toBe(404);
  });

  it("normalises a double slash POST with a body", async () => {
    const form = new FormData();
    form.set("file", new File([new TextEncoder().encode("Jane Doe\nEXPERIENCE\nAcme — Engineer | 2020 - 2023")], "cv.txt"));
    const res = await handler.fetch(new Request("http://localhost//v1/parse", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { basics: { name: string | null } };
    expect(body.basics.name).toBe("Jane Doe");
  });
});
