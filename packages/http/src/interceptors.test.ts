import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './client.ts';
import { HttpError, isHttpError } from './errors.ts';
import { InterceptorManager } from './interceptors.ts';
import type { HttpRequest } from './types.ts';
import { headersOf, json, mockFetch } from './test-utils.ts';

describe('InterceptorManager', () => {
  it('registers, unregisters via the returned function, and clears', () => {
    const manager = new InterceptorManager<number>();
    const a = (n: number) => n + 1;
    const b = (n: number) => n * 2;

    const ejectA = manager.use(a);
    manager.use(b, null);
    expect(manager.size).toBe(2);
    expect(manager.handlers.map((h) => h.fulfilled)).toEqual([a, b]);

    ejectA();
    ejectA(); // idempotent
    expect(manager.handlers.map((h) => h.fulfilled)).toEqual([b]);

    manager.clear();
    expect(manager.size).toBe(0);
  });

  it('returns a snapshot from handlers', () => {
    const manager = new InterceptorManager<number>();
    const snapshot = manager.handlers;
    manager.use((n) => n);
    expect(snapshot).toHaveLength(0);
  });
});

describe('request interceptors', () => {
  it('run in registration order and may mutate in place or return a replacement', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    client.interceptors.request.use((request) => {
      request.headers.set('X-Order', 'first');
    });
    client.interceptors.request.use(async (request) => ({
      ...request,
      url: `${request.url}?v=2`,
      headers: new Headers({ 'X-Order': `${request.headers.get('X-Order')},second` }),
    }));

    await client.get('/a');

    expect(fetch.mock.calls[0][0]).toBe('/a?v=2');
    expect(headersOf(fetch).get('x-order')).toBe('first,second');
  });

  it('see merged defaults and can change params, baseURL, and context', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, baseURL: 'https://a.test', headers: { 'X-Default': '1' } });
    let seen: HttpRequest | undefined;

    client.interceptors.request.use((request) => {
      seen = request;
      request.baseURL = 'https://b.test';
      request.params = { page: 1 };
      request.context.stamped = true;
    });

    const res = await client.get('/x');

    expect(seen?.headers.get('x-default')).toBe('1');
    expect(seen?.method).toBe('GET');
    expect(fetch.mock.calls[0][0]).toBe('https://b.test/x?page=1');
    expect(res.request.context).toEqual({ stamped: true });
  });

  it('normalizes a hand-built request returned by a plain-JS interceptor', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    client.interceptors.request.use(
      (request) => ({ ...request, method: 'post', headers: { 'X-Plain': 'yes' } }) as unknown as HttpRequest
    );

    await client.request({ url: '/a', body: { a: 1 }, method: 'PUT' });

    expect((fetch.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect(headersOf(fetch).get('x-plain')).toBe('yes');
  });

  it('stop the request when they throw, without calling fetch', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    const onResponseError = vi.fn();
    client.interceptors.request.use(() => {
      throw new Error('not signed in');
    });
    client.interceptors.response.use(null, onResponseError);

    await expect(client.get('/a')).rejects.toThrow('not signed in');
    expect(fetch).not.toHaveBeenCalled();
    expect(onResponseError).not.toHaveBeenCalled();
  });

  it('can recover from an earlier interceptor failure with onRejected', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    client.interceptors.request.use(() => {
      throw new Error('token store offline');
    });
    // The recovered request replaces the merged one, so it carries its own options.
    client.interceptors.request.use(null, () => ({
      url: '/fallback',
      method: 'GET',
      headers: new Headers(),
      context: {},
      fetch,
    }));

    await client.get('/a');

    expect(fetch.mock.calls[0][0]).toBe('/fallback');
  });

  it('rethrow from onRejected when it returns nothing', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    client.interceptors.request.use(() => {
      throw new Error('no token');
    });
    client.interceptors.request.use(null, () => {});

    await expect(client.get('/a')).rejects.toThrow('no token');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('are not affected by ejecting during an in-flight request', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    const second = vi.fn();
    let eject = (): void => {};
    client.interceptors.request.use(() => eject());
    eject = client.interceptors.request.use(second);

    await client.get('/a');
    await client.get('/b');

    expect(second).toHaveBeenCalledOnce();
  });
});

describe('response interceptors', () => {
  it('transform responses in registration order', async () => {
    const fetch = mockFetch(json({ data: { id: 1 }, meta: {} }));
    const client = createHttpClient({ fetch });

    client.interceptors.response.use((response) => {
      response.data = response.data.data;
    });
    client.interceptors.response.use((response) => ({ ...response, data: { ...response.data, seen: true } }));

    expect((await client.get('/a')).data).toEqual({ id: 1, seen: true });
  });

  it('receive HttpErrors and can recover by returning a response', async () => {
    const fetch = mockFetch(json({}, { status: 503 }));
    const client = createHttpClient({ fetch });
    client.interceptors.response.use(null, (error) => ({ ...error.response!, data: 'cached' }));

    expect((await client.get('/a')).data).toBe('cached');
  });

  it('can rethrow, and later handlers see the rethrown error', async () => {
    const fetch = mockFetch(json({}, { status: 500 }));
    const client = createHttpClient({ fetch });
    const seen: string[] = [];
    client.interceptors.response.use(null, (error) => {
      seen.push(error.code);
      throw new HttpError('wrapped', { code: error.code, request: error.request, response: error.response });
    });
    client.interceptors.response.use(null, (error) => {
      seen.push(error.message);
      throw error;
    });

    await expect(client.get('/a')).rejects.toThrow('wrapped');
    expect(seen).toEqual(['ERR_STATUS', 'wrapped']);
  });

  it('can turn a success into an HttpError that later handlers receive', async () => {
    const fetch = mockFetch(json({ error: 'quota' }));
    const client = createHttpClient({ fetch });
    client.interceptors.response.use((response) => {
      if (response.data.error) {
        throw new HttpError(response.data.error, { code: 'ERR_STATUS', request: response.request, response });
      }
    });
    const onError = vi.fn((error: HttpError) => {
      throw error;
    });
    client.interceptors.response.use(null, onError);

    await expect(client.get('/a')).rejects.toThrow('quota');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('rethrow when an error handler returns nothing, so logging never swallows failures', async () => {
    const fetch = mockFetch(json({}, { status: 500 }));
    const client = createHttpClient({ fetch });
    const log = vi.fn();
    client.interceptors.response.use(null, (error) => {
      log(error.code);
    });

    await expect(client.get('/a')).rejects.toMatchObject({ code: 'ERR_STATUS' });
    expect(log).toHaveBeenCalledWith('ERR_STATUS');
  });

  it('only pass HttpErrors to error handlers', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    const onError = vi.fn();
    client.interceptors.response.use(() => {
      throw new RangeError('bug in interceptor');
    });
    client.interceptors.response.use(null, onError);

    await expect(client.get('/a')).rejects.toThrow(RangeError);
    expect(onError).not.toHaveBeenCalled();
  });

  it('support a refresh-token flow by re-issuing the failed request', async () => {
    let token = 'expired';
    const fetch = mockFetch((_url, init) => {
      const auth = new Headers(init.headers).get('authorization');
      return auth === 'Bearer fresh' ? json({ me: 'ada' }) : json({ error: 'expired' }, { status: 401 });
    });
    const client = createHttpClient({ fetch });

    client.interceptors.request.use((request) => {
      request.headers.set('Authorization', `Bearer ${token}`);
    });
    client.interceptors.response.use(null, async (error) => {
      if (error.status !== 401 || error.request.context.retried) throw error;
      token = 'fresh';
      return client.request({ ...error.request, context: { retried: true } });
    });

    const res = await client.get('/me');

    expect(res.data).toEqual({ me: 'ada' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('stop the refresh loop when the retried request also fails', async () => {
    const fetch = mockFetch(json({}, { status: 401 }));
    const client = createHttpClient({ fetch });
    client.interceptors.response.use(null, async (error) => {
      if (error.status !== 401 || error.request.context.retried) throw error;
      return client.request({ ...error.request, context: { retried: true } });
    });

    const error = await client.get('/me').catch((e: unknown) => e);

    expect(isHttpError(error, 'ERR_STATUS')).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
