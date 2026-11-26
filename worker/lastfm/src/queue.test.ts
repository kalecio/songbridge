import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastfmRequestQueue } from './queue';

function createQueue() {
  const values = new Map<string, unknown>();
  const storage = {
    get: async <T>(key: string) => values.get(key) as T | undefined,
    put: async (key: string, value: unknown) => {
      values.set(key, value);
    },
  };
  return {
    queue: new LastfmRequestQueue({ storage }, { LASTFM_API_KEY: 'test-key', LASTFM_API_SECRET: 'test-secret' }),
    values,
  };
}

function request(method: string, priority: 'high' | 'normal' = 'normal') {
  return new Request('https://queue.test/dispatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-lastfm-priority': priority },
    body: JSON.stringify({ params: { method, api_key: 'test-key' } }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LastfmRequestQueue', () => {
  it('spaces upstream requests by the configured global interval', async () => {
    const { queue } = createQueue();
    const starts: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        starts.push(Date.now());
        return Response.json({ ok: true });
      }),
    );

    const responses = await Promise.all([
      queue.fetch(request('track.search')),
      queue.fetch(request('track.getInfo')),
      queue.fetch(request('album.search')),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(starts).toHaveLength(3);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(900);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(900);
  });

  it('prioritizes scrobbles while allowing metadata requests to proceed', async () => {
    const { queue } = createQueue();
    const methods: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const body = new URLSearchParams(String(init?.body));
        methods.push(body.get('method') ?? String(input));
        await new Promise((resolve) => setTimeout(resolve, 30));
        return Response.json({ ok: true });
      }),
    );

    const first = queue.fetch(request('track.search'));
    const regular = queue.fetch(request('album.search'));
    const priority = queue.fetch(request('track.scrobble', 'high'));
    await Promise.all([first, regular, priority]);

    expect(methods).toEqual(['track.search', 'track.scrobble', 'album.search']);
  });

  it('opens a shared cooldown after Last.fm returns error 29', async () => {
    const { queue, values } = createQueue();
    const upstream = vi.fn(async () => Response.json({ error: 29, message: 'Rate limit exceeded' }));
    vi.stubGlobal('fetch', upstream);

    const limited = await queue.fetch(request('track.search'));
    const blocked = await queue.fetch(request('album.search'));

    expect(limited.status).toBe(429);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(values.get('cooldownUntil')).toBeGreaterThan(Date.now());
  });
});
