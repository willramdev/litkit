import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient, createHttpClient, http } from './client.ts';
import { HttpError, isHttpError } from './errors.ts';
import type { StandardSchemaV1 } from './types.ts';
import { asHttpError, hangingFetch, headersOf, initOf, json, mockFetch, shouldNotResolve } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HttpClient requests', () => {
  it('sends a GET and resolves with parsed JSON and response metadata', async () => {
    const fetch = mockFetch(json({ id: 1 }, { status: 200, statusText: 'OK' }));
    const client = createHttpClient({ fetch });

    const res = await client.get('/users/1');

    expect(res.data).toEqual({ id: 1 });
    expect(res.status).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.ok).toBe(true);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.request.method).toBe('GET');
    expect(res.raw).toBeInstanceOf(Response);
    expect(fetch).toHaveBeenCalledWith('/users/1', expect.objectContaining({ method: 'GET' }));
  });

  it('accepts a config object, a URL object, and lower-case methods', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    await client.request({ url: '/a', method: 'post', body: { x: 1 } });
    await client.request(new URL('https://example.com/b'));

    expect(fetch.mock.calls[0][0]).toBe('/a');
    expect(initOf(fetch, 0).method).toBe('POST');
    expect(fetch.mock.calls[1][0]).toBe('https://example.com/b');
  });

  it.each(['post', 'put', 'patch'] as const)('%s sends a plain object body as JSON', async (method) => {
    const fetch = mockFetch(json({ ok: true }));
    const client = createHttpClient({ fetch });

    await client[method]('/items', { name: 'Ada', tags: ['a'] });

    expect(initOf(fetch).method).toBe(method.toUpperCase());
    expect(initOf(fetch).body).toBe('{"name":"Ada","tags":["a"]}');
    expect(headersOf(fetch).get('content-type')).toBe('application/json');
  });

  it.each(['delete', 'head', 'options'] as const)('%s uses the right method', async (method) => {
    const fetch = mockFetch(new Response(null, { status: 204 }));
    await createHttpClient({ fetch })[method]('/items/1');
    expect(initOf(fetch).method).toBe(method.toUpperCase());
  });

  it('JSON-encodes arrays, numbers, booleans, and objects with toJSON', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    const withToJSON = new (class Point {
      toJSON() {
        return { x: 1 };
      }
    })();

    await client.post('/a', [1, 2]);
    await client.post('/a', 42);
    await client.post('/a', false);
    await client.post('/a', withToJSON);

    expect(fetch.mock.calls.map((call) => (call[1] as RequestInit).body)).toEqual(['[1,2]', '42', 'false', '{"x":1}']);
  });

  it('keeps config.body when the body argument is omitted', async () => {
    const fetch = mockFetch(json({}));
    await createHttpClient({ fetch }).post('/a', undefined, { body: { x: 1 } });
    expect(initOf(fetch).body).toBe('{"x":1}');
  });

  it('keeps an explicit Content-Type when JSON-encoding', async () => {
    const fetch = mockFetch(json({}));
    await createHttpClient({ fetch }).post('/a', { x: 1 }, { headers: { 'Content-Type': 'application/vnd.api+json' } });
    expect(headersOf(fetch).get('content-type')).toBe('application/vnd.api+json');
  });

  it('sends strings, URLSearchParams, and Blobs unchanged', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    const search = new URLSearchParams({ a: '1' });
    const blob = new Blob(['x']);

    await client.post('/a', 'raw text');
    await client.post('/a', search);
    await client.post('/a', blob);

    expect(initOf(fetch, 0).body).toBe('raw text');
    expect(initOf(fetch, 1).body).toBe(search);
    expect(initOf(fetch, 2).body).toBe(blob);
    expect(headersOf(fetch, 0).has('content-type')).toBe(false);
  });

  it('drops a preset Content-Type for FormData so fetch can set the boundary', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, headers: { 'Content-Type': 'application/json' } });
    const form = new FormData();
    form.append('file', 'x');

    await client.post('/upload', form);

    expect(initOf(fetch).body).toBe(form);
    expect(headersOf(fetch).has('content-type')).toBe(false);
  });

  it('rejects a body on GET/HEAD with a clear TypeError instead of calling fetch', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    await expect(client.request({ url: '/a', body: { x: 1 } })).rejects.toThrow(TypeError);
    await expect(client.request({ url: '/a', method: 'HEAD', body: 'x' })).rejects.toThrow(/cannot have a body/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sets a default Accept header that callers can override', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    await client.get('/a');
    await client.get('/a', { headers: { Accept: 'text/csv' } });

    expect(headersOf(fetch, 0).get('accept')).toBe('application/json, text/plain, */*');
    expect(headersOf(fetch, 1).get('accept')).toBe('text/csv');
  });

  it('passes standard fetch options through and keeps client-only options out', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, credentials: 'include' });

    await client.get('/a', {
      cache: 'no-store',
      keepalive: true,
      timeout: 0,
      retry: 0,
      context: { tag: 'x' },
      // A non-standard option (e.g. undici's `dispatcher`) must reach fetch too.
      ...({ dispatcher: 'custom' } as object),
    });

    const init = initOf(fetch) as RequestInit & Record<string, unknown>;
    expect(init.credentials).toBe('include');
    expect(init.cache).toBe('no-store');
    expect(init.keepalive).toBe(true);
    expect(init.dispatcher).toBe('custom');
    for (const key of ['timeout', 'retry', 'context', 'fetch', 'baseURL', 'url']) {
      expect(init).not.toHaveProperty(key);
    }
  });

  it('does not pass a signal to fetch when no timeout or signal is set', async () => {
    const fetch = mockFetch(json({}));
    await createHttpClient({ fetch }).get('/a');
    expect(initOf(fetch)).not.toHaveProperty('signal');
  });

  it('passes the caller signal straight through when there is no timeout', async () => {
    const fetch = mockFetch(json({}));
    const controller = new AbortController();
    await createHttpClient({ fetch }).get('/a', { signal: controller.signal });
    expect(initOf(fetch).signal).toBe(controller.signal);
  });

  it('uses the global fetch when none is configured', async () => {
    const fetch = mockFetch(json({ global: true }));
    vi.stubGlobal('fetch', fetch);

    const res = await createHttpClient().get('/a');

    expect(res.data).toEqual({ global: true });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe('URL building', () => {
  it('joins baseURL and relative paths with exactly one slash', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, baseURL: 'https://api.test/v1/' });

    await client.get('/users');
    await client.get('users');
    await client.get('');

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      'https://api.test/v1/users',
      'https://api.test/v1/users',
      'https://api.test/v1/',
    ]);
  });

  it('ignores baseURL for absolute and protocol-relative URLs', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, baseURL: 'https://api.test' });

    await client.get('https://other.test/x');
    await client.get('//cdn.test/y');

    expect(fetch.mock.calls.map((call) => call[0])).toEqual(['https://other.test/x', '//cdn.test/y']);
  });

  it('serializes params: arrays repeat, null/undefined skip, Dates use ISO-8601', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    await client.get('/search', {
      params: {
        q: 'a b',
        page: 2,
        ids: [1, 2],
        on: true,
        skip: undefined,
        none: null,
        since: new Date('2026-01-02T03:04:05.000Z'),
      },
    });

    expect(fetch.mock.calls[0][0]).toBe(
      '/search?q=a+b&page=2&ids=1&ids=2&on=true&since=2026-01-02T03%3A04%3A05.000Z'
    );
  });

  it('appends params to an existing query and keeps the hash last', async () => {
    const fetch = mockFetch(json({}));
    await createHttpClient({ fetch }).get('/a?x=1#top', { params: { y: 2 } });
    expect(fetch.mock.calls[0][0]).toBe('/a?x=1&y=2#top');
  });

  it('accepts URLSearchParams, strings, and pairs as params', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    await client.get('/a', { params: new URLSearchParams({ a: '1' }) });
    await client.get('/a', { params: '?b=2' });
    await client.get('/a', { params: [['c', '3']] });

    expect(fetch.mock.calls.map((call) => call[0])).toEqual(['/a?a=1', '/a?b=2', '/a?c=3']);
  });

  it('merges default params with request params, request winning', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, params: { key: 'k', lang: 'en' } });

    await client.get('/a', { params: { lang: 'fr' } });
    await client.get('/a', { params: new URLSearchParams([['lang', 'de'], ['lang', 'it']]) });

    expect(fetch.mock.calls[0][0]).toBe('/a?key=k&lang=fr');
    expect(fetch.mock.calls[1][0]).toBe('/a?key=k&lang=de&lang=it');
  });

  it('uses a custom paramsSerializer', async () => {
    const fetch = mockFetch(json({}));
    const paramsSerializer = vi.fn(() => 'ids[]=1&ids[]=2');
    await createHttpClient({ fetch, paramsSerializer }).get('/a', { params: { ids: [1, 2] } });

    expect(paramsSerializer).toHaveBeenCalledWith({ ids: [1, 2] });
    expect(fetch.mock.calls[0][0]).toBe('/a?ids[]=1&ids[]=2');
  });
});

describe('headers and defaults', () => {
  it('merges default headers under request headers; null removes a default', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, headers: { 'X-App': 'kit', Authorization: 'Bearer t' } });

    await client.get('/a', { headers: { 'X-Req': 1, Authorization: null } });

    const headers = headersOf(fetch);
    expect(headers.get('x-app')).toBe('kit');
    expect(headers.get('x-req')).toBe('1');
    expect(headers.has('authorization')).toBe(false);
  });

  it('accepts Headers instances and header pairs', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, headers: new Headers({ 'X-A': 'a' }) });

    await client.get('/a', { headers: [['X-B', 'b']] });

    expect(headersOf(fetch).get('x-a')).toBe('a');
    expect(headersOf(fetch).get('x-b')).toBe('b');
  });

  it('applies later changes to client.defaults', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    client.defaults.headers.set('Authorization', 'Bearer late');
    client.defaults.timeout = 0;
    await client.get('/a');

    expect(headersOf(fetch).get('authorization')).toBe('Bearer late');
  });

  it('sends HTTP Basic auth, UTF-8 encoded', async () => {
    const fetch = mockFetch(json({}));
    await createHttpClient({ fetch }).get('/a', { auth: { username: 'zoë', password: 'p@ss' } });

    expect(headersOf(fetch).get('authorization')).toBe('Basic em/DqzpwQHNz');
  });

  it('does not share header state between requests', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });

    await client.get('/a', { headers: { 'X-Once': '1' } });
    await client.get('/b');

    expect(headersOf(fetch, 1).has('x-once')).toBe(false);
    expect(client.defaults.headers.has('x-once')).toBe(false);
  });
});

describe('response parsing', () => {
  it('parses +json content types and returns undefined for an empty JSON body', async () => {
    const fetch = mockFetch(
      new Response('{"title":"Nope"}', { headers: { 'content-type': 'application/problem+json; charset=utf-8' } }),
      new Response('', { headers: { 'content-type': 'application/json' } })
    );
    const client = createHttpClient({ fetch });

    expect((await client.get('/a')).data).toEqual({ title: 'Nope' });
    expect((await client.get('/b')).data).toBeUndefined();
  });

  it('reads text, XML, and missing content types as strings', async () => {
    const fetch = mockFetch(
      new Response('hello', { headers: { 'content-type': 'text/plain' } }),
      new Response('<a/>', { headers: { 'content-type': 'application/xml' } }),
      new Response('raw')
    );
    const client = createHttpClient({ fetch });

    expect((await client.get('/a')).data).toBe('hello');
    expect((await client.get('/b')).data).toBe('<a/>');
    expect((await client.get('/c')).data).toBe('raw');
  });

  it('reads other content types as a Blob', async () => {
    const fetch = mockFetch(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }));
    const { data } = await createHttpClient({ fetch }).get('/img');

    expect(typeof data.arrayBuffer).toBe('function');
    expect(data.size).toBe(3);
  });

  it('returns undefined data for 204 and HEAD without reading the body', async () => {
    const fetch = mockFetch(
      new Response(null, { status: 204 }),
      new Response('ignored', { headers: { 'content-type': 'application/json' } })
    );
    const client = createHttpClient({ fetch });

    expect((await client.delete('/a')).data).toBeUndefined();
    expect((await client.head('/b')).data).toBeUndefined();
  });

  it('honours an explicit responseType', async () => {
    const body = () => new Response('{"a":1}', { headers: { 'content-type': 'application/json' } });
    const fetch = mockFetch(body);
    const client = createHttpClient({ fetch });

    expect((await client.get('/a', { responseType: 'text' })).data).toBe('{"a":1}');
    expect((await client.get('/a', { responseType: 'arrayBuffer' })).data.byteLength).toBe(7);
    const stream = (await client.get('/a', { responseType: 'stream' })).data as ReadableStream;
    expect(await new Response(stream).text()).toBe('{"a":1}');
  });

  it('forces JSON parsing with responseType json', async () => {
    const fetch = mockFetch(new Response('{"a":1}', { headers: { 'content-type': 'text/plain' } }));
    expect((await createHttpClient({ fetch }).get('/a', { responseType: 'json' })).data).toEqual({ a: 1 });
  });

  it('uses a custom parseJson and stringifyJson', async () => {
    const fetch = mockFetch(json({ at: '2026-01-01T00:00:00.000Z' }));
    const client = createHttpClient({
      fetch,
      parseJson: (text) => JSON.parse(text, (key, value) => (key === 'at' ? new Date(value) : value)),
      stringifyJson: (value) => `JSON:${JSON.stringify(value)}`,
    });

    const res = await client.post('/a', { x: 1 });

    expect(res.data.at).toBeInstanceOf(Date);
    expect(initOf(fetch).body).toBe('JSON:{"x":1}');
  });

  it('throws a TypeError for an unknown responseType', async () => {
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    await expect(client.get('/a', { responseType: 'jsn' as 'json' })).rejects.toThrow(/unknown responseType "jsn"/);
  });

  it('reports download progress and still parses the body', async () => {
    const fetch = mockFetch(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"a":'));
              controller.enqueue(new TextEncoder().encode('1}'));
              controller.close();
            },
          }),
          { headers: { 'content-type': 'application/json', 'content-length': '7' } }
        )
    );
    const onDownloadProgress = vi.fn();

    const res = await createHttpClient({ fetch }).get('/a', { onDownloadProgress });

    expect(res.data).toEqual({ a: 1 });
    expect(onDownloadProgress.mock.calls.map((call) => call[0])).toEqual([
      { loaded: 5, total: 7, progress: 5 / 7 },
      { loaded: 7, total: 7, progress: 1 },
    ]);
  });

  it('reports progress with an unknown total when Content-Length is missing', async () => {
    const fetch = mockFetch(new Response('abc', { headers: { 'content-type': 'text/plain' } }));
    const onDownloadProgress = vi.fn();

    await createHttpClient({ fetch }).get('/a', { onDownloadProgress });

    expect(onDownloadProgress).toHaveBeenLastCalledWith({ loaded: 3, total: undefined, progress: undefined });
  });
});

describe('errors', () => {
  it('rejects non-2xx with ERR_STATUS carrying the parsed error body', async () => {
    const fetch = mockFetch(json({ message: 'missing' }, { status: 404, statusText: 'Not Found' }));
    const error = await createHttpClient({ fetch, baseURL: 'https://api.test' })
      .get('/users/9')
      .catch((e: unknown) => e);

    expect(isHttpError(error)).toBe(true);
    expect(isHttpError(error, 'ERR_STATUS')).toBe(true);
    expect(isHttpError(error, 'ERR_NETWORK')).toBe(false);
    const httpError = error as HttpError;
    expect(httpError).toBeInstanceOf(Error);
    expect(httpError.name).toBe('HttpError');
    expect(httpError.status).toBe(404);
    expect(httpError.data).toEqual({ message: 'missing' });
    expect(httpError.message).toBe('Request failed with status 404 Not Found: GET https://api.test/users/9');
    expect(httpError.toJSON()).toEqual({
      name: 'HttpError',
      message: httpError.message,
      code: 'ERR_STATUS',
      status: 404,
      method: 'GET',
      url: '/users/9',
    });
  });

  it('keeps query strings (which may hold API keys) out of messages and toJSON', async () => {
    const fetch = mockFetch(json({}, { status: 403 }));
    const error = await createHttpClient({ fetch, params: { api_key: 'secret' } })
      .get('/a?token=secret#frag')
      .then(shouldNotResolve, asHttpError);

    expect(error.message).toBe('Request failed with status 403: GET /a');
    expect(error.toJSON().url).toBe('/a');
    expect(JSON.stringify(error)).not.toContain('secret');
    expect(fetch.mock.calls[0][0]).toBe('/a?token=secret&api_key=secret#frag');
  });

  it('keeps a non-JSON error page readable instead of throwing ERR_PARSE', async () => {
    const fetch = mockFetch(
      new Response('<h1>Bad Gateway</h1>', { status: 502, headers: { 'content-type': 'application/json' } })
    );
    const error = await createHttpClient({ fetch }).get('/a').then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_STATUS');
    expect(error.data).toBe('<h1>Bad Gateway</h1>');
  });

  it('resolves any status accepted by validateStatus', async () => {
    const fetch = mockFetch(json({ gone: true }, { status: 410 }));
    const res = await createHttpClient({ fetch, validateStatus: () => true }).get('/a');

    expect(res.status).toBe(410);
    expect(res.ok).toBe(false);
    expect(res.data).toEqual({ gone: true });
  });

  it('rejects invalid JSON on a success response with ERR_PARSE', async () => {
    const fetch = mockFetch(new Response('{oops', { headers: { 'content-type': 'application/json' } }));
    const error = await createHttpClient({ fetch }).get('/a').then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_PARSE');
    expect(error.data).toBe('{oops');
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });

  it('rejects a failed fetch with ERR_NETWORK and keeps the cause', async () => {
    const cause = new TypeError('Failed to fetch');
    const error = await createHttpClient({ fetch: mockFetch(cause) }).get('/a').then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_NETWORK');
    expect(error.response).toBeUndefined();
    expect(error.status).toBeUndefined();
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('Network error: Failed to fetch (GET /a)');
  });

  it('rejects with ERR_TIMEOUT when the timeout elapses', async () => {
    const error = await createHttpClient({ fetch: hangingFetch(), timeout: 10 })
      .get('/slow')
      .then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_TIMEOUT');
    expect(error.message).toBe('Timeout of 10ms exceeded: GET /slow');
  });

  it('rejects with ERR_ABORTED when the caller aborts', async () => {
    const controller = new AbortController();
    const pending = createHttpClient({ fetch: hangingFetch(), timeout: 5_000 })
      .get('/a', { signal: controller.signal })
      .then(shouldNotResolve, asHttpError);

    controller.abort();

    expect((await pending).code).toBe('ERR_ABORTED');
  });

  it('does not call fetch for an already-aborted signal', async () => {
    const fetch = mockFetch(json({}));
    const error = await createHttpClient({ fetch })
      .get('/a', { signal: AbortSignal.abort() })
      .then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_ABORTED');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('can be constructed by callers, e.g. to reject an error envelope', () => {
    const request = { url: '/a', method: 'GET', headers: new Headers(), context: {} };
    const error = new HttpError('boom', { code: 'ERR_STATUS', request, cause: 'why' });

    expect(error.message).toBe('boom');
    expect(error.cause).toBe('why');
    expect(isHttpError(error)).toBe(true);
    expect(isHttpError(new Error('x'))).toBe(false);
    expect(isHttpError(null)).toBe(false);
  });
});

describe('xsrf', () => {
  afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('copies the cookie into a header on same-origin state-changing requests', async () => {
    document.cookie = 'XSRF-TOKEN=tok%20en';
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch, xsrf: true });

    await client.post('/a', {});
    await client.get('/a');
    await client.post('https://elsewhere.test/a', {});

    expect(headersOf(fetch, 0).get('x-xsrf-token')).toBe('tok en');
    expect(headersOf(fetch, 1).has('x-xsrf-token')).toBe(false);
    expect(headersOf(fetch, 2).has('x-xsrf-token')).toBe(false);
  });

  it('supports custom cookie and header names and is off by default', async () => {
    document.cookie = 'csrftoken=abc';
    const fetch = mockFetch(json({}));

    await createHttpClient({ fetch, xsrf: { cookieName: 'csrftoken', headerName: 'X-CSRFToken' } }).post('/a', {});
    await createHttpClient({ fetch }).post('/a', {});

    expect(headersOf(fetch, 0).get('x-csrftoken')).toBe('abc');
    expect(headersOf(fetch, 1).has('x-csrftoken')).toBe(false);
  });
});

describe('schema validation', () => {
  interface User {
    id: number;
    name: string;
  }

  function userSchema(): StandardSchemaV1<unknown, User> {
    return {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate(value) {
          const v = value as Partial<User>;
          if (typeof v?.id !== 'number') return { issues: [{ message: 'Expected number', path: ['id'] }] };
          if (typeof v.name !== 'string') return { issues: [{ message: 'Expected string', path: [{ key: 'name' }] }] };
          return { value: { id: v.id, name: v.name.trim() } };
        },
      },
    };
  }

  it('replaces data with the Standard Schema output', async () => {
    const fetch = mockFetch(json({ id: 1, name: '  Ada ', extra: true }));
    const res = await createHttpClient({ fetch }).get('/u', { schema: userSchema() });
    expect(res.data).toEqual({ id: 1, name: 'Ada' });
  });

  it('rejects with ERR_VALIDATION and the schema issues', async () => {
    const fetch = mockFetch(json({ id: 'x' }));
    const error = await createHttpClient({ fetch, retry: 3 })
      .get('/u', { schema: userSchema() })
      .then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_VALIDATION');
    expect(error.issues).toEqual([{ message: 'Expected number', path: ['id'] }]);
    expect(error.message).toBe('Response validation failed: id: Expected number (GET /u)');
    expect(error.data).toEqual({ id: 'x' });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('accepts a plain function as the schema', async () => {
    const fetch = mockFetch(json({ count: '3' }), json({}));
    const client = createHttpClient({ fetch });
    const parse = (data: unknown) => {
      const count = Number((data as { count?: unknown }).count);
      if (Number.isNaN(count)) throw new Error('count must be numeric');
      return count;
    };

    expect((await client.get('/a', { schema: parse })).data).toBe(3);
    const error = await client.get('/a', { schema: parse }).then(shouldNotResolve, asHttpError);
    expect(error.code).toBe('ERR_VALIDATION');
    expect(error.message).toMatch(/count must be numeric/);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('does not validate error responses', async () => {
    const schema = vi.fn(() => 1);
    const fetch = mockFetch(json({ message: 'nope' }, { status: 400 }));
    const error = await createHttpClient({ fetch }).get('/a', { schema }).then(shouldNotResolve, asHttpError);

    expect(error.code).toBe('ERR_STATUS');
    expect(schema).not.toHaveBeenCalled();
  });
});

describe('extend', () => {
  it('copies defaults, merges overrides, and leaves the parent untouched', async () => {
    const fetch = mockFetch(json({}));
    const parent = createHttpClient({ fetch, baseURL: 'https://api.test', headers: { 'X-A': 'a' }, timeout: 1_000 });
    const child = parent.extend({ baseURL: 'https://api.test/admin', headers: { 'X-B': 'b' } });

    await child.get('/users');
    await parent.get('/users');

    expect(fetch.mock.calls[0][0]).toBe('https://api.test/admin/users');
    expect(headersOf(fetch, 0).get('x-a')).toBe('a');
    expect(headersOf(fetch, 0).get('x-b')).toBe('b');
    expect(child.defaults.timeout).toBe(1_000);
    expect(fetch.mock.calls[1][0]).toBe('https://api.test/users');
    expect(headersOf(fetch, 1).has('x-b')).toBe(false);
  });

  it('removes a parent header with null', async () => {
    const fetch = mockFetch(json({}));
    const child = createHttpClient({ fetch, headers: { Authorization: 'Bearer t' } }).extend({
      headers: { Authorization: null },
    });

    await child.get('/public');

    expect(headersOf(fetch).has('authorization')).toBe(false);
  });

  it('runs parent interceptors around its own, including ones added later', async () => {
    const order: string[] = [];
    const fetch = mockFetch(json({}));
    const parent = createHttpClient({ fetch });
    const child = parent.extend();

    child.interceptors.request.use(() => void order.push('child request'));
    child.interceptors.response.use(() => void order.push('child response'));
    parent.interceptors.request.use(() => void order.push('parent request'));
    parent.interceptors.response.use(() => void order.push('parent response'));

    await child.get('/a');
    expect(order).toEqual(['parent request', 'child request', 'child response', 'parent response']);

    order.length = 0;
    await parent.get('/a');
    expect(order).toEqual(['parent request', 'parent response']);
  });
});

describe('default instance', () => {
  it('exports a shared HttpClient', () => {
    expect(http).toBeInstanceOf(HttpClient);
    expect(http.defaults.headers).toBeInstanceOf(Headers);
  });
});

describe('dev warnings for misspelled options', () => {
  it('warns once, with the [litkit] prefix, when an axios-style option is used', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = mockFetch(json({}));
    const client = createHttpClient({ fetch });
    const axiosStyle = { data: { a: 1 } } as object;

    await client.post('/a', undefined, axiosStyle);
    await client.post('/a', undefined, axiosStyle);

    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toMatch(/^\[litkit\] HttpClient request: unknown option `data` — use `body`/);
  });

  it('warns about baseUrl in client config', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createHttpClient({ baseUrl: '/api' } as object);
    expect(String(warn.mock.calls[0][0])).toMatch(/did you mean `baseURL`\?/);
  });
});
