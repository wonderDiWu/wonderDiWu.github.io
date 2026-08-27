export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    if (shouldLogVisit(request, response)) {
      ctx.waitUntil(writeVisit(request, env).catch((error) => console.error("visit log failed", error)));
    }
    return response;
  },
};

export function shouldLogVisit(request, response) {
  if (request.method !== "GET" || !response.ok) return false;
  const accept = request.headers.get("accept") || "";
  const destination = request.headers.get("sec-fetch-dest") || "";
  const contentType = response.headers.get("content-type") || "";
  return accept.includes("text/html") && contentType.includes("text/html") && (!destination || destination === "document");
}

export function buildVisitRecord(request, now = new Date()) {
  const cf = request.cf || {};
  return {
    time: now.toISOString(),
    ip: clean(request.headers.get("cf-connecting-ip"), 64),
    country: countryCode(cf.country),
    region: clean(cf.region, 100),
    city: clean(cf.city, 100),
    path: clean(new URL(request.url).pathname, 512) || "/",
    referrer: referrerOrigin(request.headers.get("referer")),
    userAgent: summariseUserAgent(request.headers.get("user-agent")),
  };
}

async function writeVisit(request, env) {
  if (!env.VISITOR_LOGS) throw new Error("VISITOR_LOGS binding is required");
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const key = `visits/${date}/${now.toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}`;
  await env.VISITOR_LOGS.put(key, JSON.stringify(buildVisitRecord(request, now)), { expirationTtl: 30 * 86400 });
}

export function referrerOrigin(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "";
  } catch { return ""; }
}

export function summariseUserAgent(value) {
  if (!value) return "";
  const browser = /Edg\//.test(value) ? "Edge" : /Firefox\//.test(value) ? "Firefox" : /Chrome\//.test(value) ? "Chrome" : /Safari\//.test(value) ? "Safari" : "Other";
  const os = /Android/.test(value) ? "Android" : /iPhone|iPad|iPod/.test(value) ? "iOS" : /Windows/.test(value) ? "Windows" : /Mac OS X/.test(value) ? "macOS" : /Linux/.test(value) ? "Linux" : "Other";
  return `${browser}/${os}`;
}

function clean(value, limit) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, limit) : "";
}
function countryCode(value) { return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : ""; }
