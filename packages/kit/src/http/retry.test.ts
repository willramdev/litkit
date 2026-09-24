import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './client.ts';
import type { HttpError } from './errors.ts';
import { parseRetryAfter } from './retry.ts';
import { asHttpError, hangingFetch, json, mockFetch, shouldNotResolve } from './test-utils.ts';

// A zero delay keeps these tests fast; delay/backoff timing is tested separately.
const fast = { delay: 0 };

afterEach(() => {
  vi.useRealTimers();
});

describe('retry', () => {
  it('is off by default', async () => {
    const fetch = mockFetch(json({}, { status: 503 }));
    await expect(createHttpClient({ fetch }).get('/a')).rejects.toMatchObject({ code: 'ERR_STATUS' });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('retries a retryable status and resolves once the server recovers', async () => {
    const fetch = mockFetch(json({}, { status: 503 }), json({}, { status: 502 }), json({ ok: 1 }));
    const res = await createHttpClient({ fetch, retry: { limit: 2, ...fast } }).get('/a');

    expect(res.data).toEqual({ ok: 1 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('gives up after `limit` retries and rejects with the last error', async () => {
    const fetch = mockFetch(json({}, { status: 500 }));
    const error = await createHttpClient({ fetch, retry: { limit: 2, ...fast } })
      .get('/a')
      .then(shouldNotResolve, asHttpError);

    expect(error.status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('accepts a number as the retry limit and true for the default limit of 2', async () => {
    const fetch = mockFetch(json({}, { status: 500 }));
    const client = createHttpClient({ fetch, retry: { ...fast } });

    await client.get('/a', { retry: 1 }).catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(2);

    fetch.mockClear();
    await client.get('/a', { retry: true }).catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry a non-retryable status', async () => {
    const fetch = mockFetch(json({}, { status: 404 }));
    await createHttpClient({ fetch, retry: { limit: 3, ...fast } }).get('/a').catch(() => {});
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('does not retry POST unless it is listed in methods', async () => {
    const fetch = mockFetch(json({}, { status: 503 }));
    const client = createHttpClient({ fetch, retry: { limit: 1, ...fast } });

    await client.post('/a', {}).catch(() => {});
    expect(fetch).toHaveBeenCalledOnce();

    fetch.mockClear();
    await client.post('/a', {}, { retry: { methods: ['post'] } }).catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries network errors', async () => {
    const fetch = mockFetch(new TypeError('Failed to fetch'), json({ ok: 1 }));
    const res = await createHttpClient({ fetch, retry: { limit: 1, ...fast } }).get('/a');
    expect(res.data).toEqual({ ok: 1 });
  });

  it('retries timeouts only with retryOnTimeout', async () => {
    const fetch = hangingFetch();
    const client = createHttpClient({ fetch, timeout: 5, retry: { limit: 1, ...fast } });

    await client.get('/a').catch(() => {});
    expect(fetch).toHaveBeenCalledOnce();

    fetch.mockClear();
    const error = await client
      .get('/a', { retry: { retryOnTimeout: true } })
      .then(shouldNotResolve, asHttpError);
    expect(error.code).toBe('ERR_TIMEOUT');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('lets shouldRetry force, veto, or defer the decision', async () => {
    const fetch = mockFetch(json({}, { status: 400 }));
    const client = createHttpClient({ fetch });

    await client.post('/a', {}, { retry: { limit: 1, ...fast, shouldRetry: () => true } }).catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(2);

    fetch.mockClear();
    fetch.mockResolvedValue(json({}, { status: 503 }));
    await client.get('/a', { retry: { limit: 1, ...fast, shouldRetry: async () => false } }).catch(() => {});
    expect(fetch).toHaveBeenCalledOnce();

    fetch.mockClear();
    const shouldRetry = vi.fn(() => undefined);
    await client.get('/a', { retry: { limit: 1, ...fast, shouldRetry } }).catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(shouldRetry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1 }));
  });

  it('never retries an abort, even when shouldRetry says yes', async () => {
    const fetch = mockFetch(json({}));
    const shouldRetry = vi.fn(() => true);
    await createHttpClient({ fetch, retry: { limit: 3, shouldRetry } })
      .get('/a', { signal: AbortSignal.abort() })
      .catch(() => {});

    expect(shouldRetry).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('runs request interceptors once, not once per attempt', async () => {
    const fetch = mockFetch(json({}, { status: 503 }), json({}));
    const client = createHttpClient({ fetch, retry: { limit: 1, ...fast } });
    const interceptor = vi.fn();
    client.interceptors.request.use(interceptor);

    await client.get('/a');

    expect(interceptor).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('waits with exponential backoff by default', async () => {
    vi.useFakeTimers();
    const fetch = mockFetch(json({}, { status: 503 }), json({}, { status: 503 }), json({}));
    const done = createHttpClient({ fetch, retry: 2 }).get('/a');

    await vi.advanceTimersByTimeAsync(299);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(599);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    await done;
  });

  it('honours Retry-After on 429, capped by maxDelay', async () => {
    vi.useFakeTimers();
    const fetch = mockFetch(json({}, { status: 429, headers: { 'Retry-After': '120' } }), json({}));
    const done = createHttpClient({ fetch, retry: { limit: 1, delay: 0, maxDelay: 2_000 } }).get('/a');

    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await done;
  });

  it('passes the retry number to a delay function', async () => {
    const delay = vi.fn((_attempt: number) => 0);
    const fetch = mockFetch(json({}, { status: 500 }));
    await createHttpClient({ fetch, retry: { limit: 2, delay } }).get('/a').catch(() => {});
    expect(delay.mock.calls.map((call) => call[0])).toEqual([1, 2]);
  });

  it('rejects with ERR_ABORTED when aborted while waiting to retry', async () => {
    const fetch = mockFetch(json({}, { status: 503 }));
    const controller = new AbortController();
    const pending = createHttpClient({ fetch, retry: { limit: 1, delay: 10_000 } })
      .get('/a', { signal: controller.signal })
      .then(shouldNotResolve, asHttpError);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    const error = await pending;

    expect(error.code).toBe('ERR_ABORTED');
    expect((error.cause as HttpError).status).toBe(503);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('merges request retry options over client retry options', async () => {
    const fetch = mockFetch(json({}, { status: 418 }));
    const client = createHttpClient({ fetch, retry: { limit: 1, ...fast } });

    await client.get('/a', { retry: { statusCodes: [418] } }).catch(() => {});

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('parseRetryAfter', () => {
  it('parses delta-seconds and HTTP dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    expect(parseRetryAfter('3')).toBe(3_000);
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:05 GMT')).toBe(5_000);
    expect(parseRetryAfter('Wed, 31 Dec 2025 00:00:00 GMT')).toBe(0);
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});
