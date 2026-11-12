import { createHash } from "node:crypto";

interface Env {
  LASTFM_API_KEY: string;
  LASTFM_API_SECRET: string;
  REQUEST_LIMITER: { limit(_input: { key: string }): Promise<{ success: boolean }> };
}

const LASTFM_URL = "https://ws.audioscrobbler.com/2.0/";
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_FIELDS = new Set([
  "method", "api_key", "format", "callback", "api_sig", "sk", "token",
  "artist", "track", "album", "timestamp", "duration", "trackNumber",
  "mbid", "chosenByUser", "context", "streamId", "albumArtist", "trackAuth",
  "limit", "page", "autocorrect", "username",
]);
const BATCH_FIELDS = new Set(["artist", "track", "album", "timestamp", "duration", "trackNumber"]);
const ALLOWED_METHODS = new Set([
  "auth.getToken", "auth.getSession", "track.updateNowPlaying", "track.scrobble",
  "track.search", "album.search", "track.getInfo", "album.getInfo",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function sign(params: Record<string, string>, secret: string): string {
  const canonical = Object.keys(params)
    .filter((key) => !["format", "callback", "api_sig"].includes(key))
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");
  return createHash("md5").update(`${canonical}${secret}`, "utf8").digest("hex");
}

function validParams(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 80 && entries.every(([key, item]) =>
    (ALLOWED_FIELDS.has(key) || /^([a-zA-Z]+)\[(?:[0-9]|[1-4][0-9])\]$/.test(key)
      && BATCH_FIELDS.has(key.slice(0, key.indexOf("["))))
    && typeof item === "string" && item.length <= 4096,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return json({ error: "payload_too_large" }, 413);
    }

    let body: { params?: unknown };
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return json({ error: "payload_too_large" }, 413);
      }
      body = JSON.parse(raw) as { params?: unknown };
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    if (!validParams(body.params)) return json({ error: "invalid_params" }, 400);
    const params = { ...body.params };
    const method = params.method;
    if (!method || !ALLOWED_METHODS.has(method)) return json({ error: "method_not_allowed" }, 403);
    if (params.api_key !== env.LASTFM_API_KEY || params.api_sig || !env.LASTFM_API_SECRET) {
      return json({ error: "invalid_credentials" }, 400);
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown-client";
    const limiterKey = params.sk
      ? `session:${createHash("sha256").update(params.sk).digest("hex")}`
      : `ip:${ip}`;
    try {
      if (!(await env.REQUEST_LIMITER.limit({ key: limiterKey })).success) {
        return json({ error: "rate_limited" }, 429);
      }
    } catch {
      return json({ error: "temporarily_unavailable" }, 503);
    }

    params.api_sig = sign(params, env.LASTFM_API_SECRET);
    try {
      const upstream = await fetch(LASTFM_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
      });
      const lastfm = await upstream.json().catch(() => null);
      if (!lastfm || typeof lastfm !== "object") return json({ error: "invalid_upstream_response" }, 502);
      return json({ lastfm }, upstream.ok ? 200 : upstream.status);
    } catch {
      return json({ error: "upstream_unavailable" }, 502);
    }
  },
};
