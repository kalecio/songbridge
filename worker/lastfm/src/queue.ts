import { createHash } from 'node:crypto';

interface Env {
  LASTFM_API_KEY: string;
  LASTFM_API_SECRET: string;
  LASTFM_GLOBAL_INTERVAL_MS?: string;
}

interface QueueStorage {
  get<T>(_key: string): Promise<T | undefined>;
  put(_key: string, _value: unknown): Promise<void>;
}

interface QueueState {
  storage: QueueStorage;
}

interface QueuedRequest {
  request: Request;
  priority: boolean;
  resolve: (_response: Response) => void;
}

const LASTFM_URL = 'https://ws.audioscrobbler.com/2.0/';
const DEFAULT_INTERVAL_MS = 1000;
const MIN_INTERVAL_MS = 1000;
const MAX_INTERVAL_MS = 10000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_PENDING_REQUESTS = 10;
const MAX_PRIORITY_BURST = 5;
const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

function sign(params: Record<string, string>, secret: string): string {
  const canonical = Object.keys(params)
    .filter((key) => !['format', 'callback', 'api_sig'].includes(key))
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  return createHash('md5').update(`${canonical}${secret}`, 'utf8').digest('hex');
}

function apiErrorCode(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const value = (body as { error?: unknown }).error;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function wait(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/** Serializes all Songbridge API traffic through one globally addressed object. */
export class LastfmRequestQueue {
  private readonly pending: QueuedRequest[] = [];
  private processing = false;
  private priorityBurst = 0;
  private readonly intervalMs: number;
  private readonly storage: QueueStorage;

  constructor(
    ctx: QueueState,
    private readonly env: Env,
  ) {
    this.storage = ctx.storage;
    const configuredInterval = Number(env.LASTFM_GLOBAL_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
    this.intervalMs = Number.isFinite(configuredInterval)
      ? Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, configuredInterval))
      : DEFAULT_INTERVAL_MS;
  }

  fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return Promise.resolve(json({ error: 'method_not_allowed' }, 405));
    if (this.pending.length >= MAX_PENDING_REQUESTS) {
      const retryAfter = Math.max(1, Math.ceil(((this.pending.length + 1) * this.intervalMs) / 1000));
      return Promise.resolve(json({ error: 'rate_limited' }, 429, { 'retry-after': String(retryAfter) }));
    }

    return new Promise((resolve) => {
      this.pending.push({ request, priority: request.headers.get('x-lastfm-priority') === 'high', resolve });
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.pending.length) {
        const priorityIndex = this.pending.findIndex((queued) => queued.priority);
        const regularIndex = this.pending.findIndex((queued) => !queued.priority);
        const usePriority = priorityIndex >= 0 && (regularIndex < 0 || this.priorityBurst < MAX_PRIORITY_BURST);
        const [queued] = this.pending.splice(usePriority ? priorityIndex : regularIndex, 1);
        if (usePriority) this.priorityBurst += 1;
        else this.priorityBurst = 0;
        try {
          queued.resolve(await this.forward(queued.request));
        } catch {
          queued.resolve(json({ error: 'upstream_unavailable' }, 502));
        }
      }
    } finally {
      this.processing = false;
      if (this.pending.length) void this.drain();
    }
  }

  private async forward(request: Request): Promise<Response> {
    let body: { params?: unknown };
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return json({ error: 'payload_too_large' }, 413);
      }
      body = JSON.parse(raw) as { params?: unknown };
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    if (!body.params || typeof body.params !== 'object' || Array.isArray(body.params)) {
      return json({ error: 'invalid_params' }, 400);
    }
    const params = body.params as Record<string, unknown>;
    const method = params.method;
    if (
      typeof method !== 'string' ||
      typeof params.api_key !== 'string' ||
      params.api_key !== this.env.LASTFM_API_KEY
    ) {
      return json({ error: 'invalid_credentials' }, 400);
    }

    const now = Date.now();
    const cooldownUntil = (await this.storage.get<number>('cooldownUntil')) ?? 0;
    if (cooldownUntil > now) {
      const retryAfter = Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
      return json({ error: 'rate_limited' }, 429, { 'retry-after': String(retryAfter) });
    }

    const nextAllowedAt = (await this.storage.get<number>('nextAllowedAt')) ?? 0;
    const scheduledAt = Math.max(Date.now(), nextAllowedAt);
    await this.storage.put('nextAllowedAt', scheduledAt + this.intervalMs);
    await wait(scheduledAt - Date.now());

    const signedParams = Object.fromEntries(
      Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    signedParams.api_sig = sign(signedParams, this.env.LASTFM_API_SECRET);
    let upstream: Response;
    try {
      upstream = await fetch(LASTFM_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(signedParams),
      });
    } catch {
      return json({ error: 'upstream_unavailable' }, 502);
    }

    const lastfm = await upstream.json().catch(() => null);
    if (!lastfm || typeof lastfm !== 'object') {
      return json({ error: 'invalid_upstream_response' }, upstream.ok ? 502 : upstream.status);
    }

    const limited = upstream.status === 429 || apiErrorCode(lastfm) === 29;
    if (limited) {
      const previousFailures = (await this.storage.get<number>('rateLimitFailures')) ?? 0;
      const backoffMs = Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.min(previousFailures, 6));
      const upstreamRetryAfter = Number(upstream.headers.get('retry-after'));
      const retryAfterMs =
        Number.isFinite(upstreamRetryAfter) && upstreamRetryAfter > 0
          ? Math.min(60 * 60 * 1000, upstreamRetryAfter * 1000)
          : backoffMs;
      const cooldownMs = Math.max(backoffMs, retryAfterMs);
      await this.storage.put('rateLimitFailures', previousFailures + 1);
      await this.storage.put('cooldownUntil', Date.now() + cooldownMs);
      await this.storage.put('nextAllowedAt', Date.now() + cooldownMs);
      return json({ lastfm }, 429, { 'retry-after': String(Math.ceil(cooldownMs / 1000)) });
    }

    if (upstream.ok && apiErrorCode(lastfm) === undefined) {
      await this.storage.put('rateLimitFailures', 0);
      await this.storage.put('cooldownUntil', 0);
    }
    return json({ lastfm }, upstream.ok ? 200 : upstream.status);
  }
}
