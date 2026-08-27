import test from "node:test";
import assert from "node:assert/strict";
import worker, { buildVisitRecord, referrerOrigin, shouldLogVisit, summariseUserAgent } from "../src/index.js";

test("logs successful HTML document navigations only", () => {
  const html = new Response("", { headers: { "content-type": "text/html" } });
  const page = new Request("https://diwu.uk/research", { headers: { accept: "text/html", "sec-fetch-dest": "document" } });
  const asset = new Request("https://diwu.uk/main.css", { headers: { accept: "text/css", "sec-fetch-dest": "style" } });
  assert.equal(shouldLogVisit(page, html), true);
  assert.equal(shouldLogVisit(asset, new Response("", { headers: { "content-type": "text/css" } })), false);
  assert.equal(shouldLogVisit(page, new Response("missing", { status: 404, headers: { "content-type": "text/html" } })), false);
});

test("serialises requested fields while minimising URL details", () => {
  const request = new Request("https://diwu.uk/publications?private=value", { headers: {
    "cf-connecting-ip": "203.0.113.42", referer: "https://google.com/search?q=name",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  } });
  Object.defineProperty(request, "cf", { value: { country: "GB", region: "Scotland", city: "Dundee" } });
  assert.deepEqual(buildVisitRecord(request, new Date("2026-08-26T23:10:03Z")), {
    time: "2026-08-26T23:10:03.000Z", ip: "203.0.113.42", country: "GB", region: "Scotland",
    city: "Dundee", path: "/publications", referrer: "https://google.com", userAgent: "Chrome/macOS",
  });
  assert.equal(referrerOrigin("javascript:alert(1)"), "");
  assert.equal(summariseUserAgent(""), "");
});

test("writes one KV entry with a 30-day TTL", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response("<html></html>", { headers: { "content-type": "text/html" } });
  const puts = [];
  const pending = [];
  const request = new Request("https://diwu.uk/", { headers: { accept: "text/html", "sec-fetch-dest": "document" } });
  Object.defineProperty(request, "cf", { value: { country: "GB", region: "Scotland", city: "Dundee" } });
  await worker.fetch(request, { VISITOR_LOGS: { async put(...args) { puts.push(args); } } }, { waitUntil(task) { pending.push(task); } });
  await Promise.all(pending);
  assert.equal(puts.length, 1);
  assert.match(puts[0][0], /^visits\/\d{4}-\d{2}-\d{2}\//);
  assert.equal(puts[0][2].expirationTtl, 30 * 86400);
  assert.equal(JSON.parse(puts[0][1]).path, "/");
});
