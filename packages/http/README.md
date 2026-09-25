# @willramdev/http

A small `fetch` wrapper that covers what you'd otherwise install axios for: instances with defaults,
interceptors, timeouts, retries with backoff, typed errors, and response validation. It is
JavaScript-first: plain objects go out as JSON and JSON comes back parsed, with no
`JSON.stringify` or `.json()` calls. TypeScript types are inferred from the values you pass,
so you don't need to write generics.

## Install

```bash
npm install @willramdev/http
```

It has no framework dependency, so it runs in browsers, web workers, Node 18+ and server-side
rendering. In a litkit app it pairs with [`@willramdev/kit`](../kit/README.md#context), which can
hand a client to your components through context, and [`@willramdev/query`](../query/README.md), where
it serves as the `queryFn`.

## Quickstart

<!-- doc-check -->
```ts
import { createHttpClient, isHttpError } from '@willramdev/http';

export const api = createHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 10_000,
  retry: 2,
});

// Runs before every request.
api.interceptors.request.use((request) => {
  request.headers.set('Authorization', `Bearer ${localStorage.getItem('token')}`);
});

const { data: users } = await api.get('/users', { params: { page: 2, tags: ['a', 'b'] } });
const { data: created } = await api.post('/users', { name: 'Ada' });
console.log(users, created);

try {
  await api.delete('/users/42');
} catch (error) {
  if (isHttpError(error) && error.status === 404) {
    // already deleted
  } else {
    throw error;
  }
}
```

## Requests

| Method | Signature |
|--------|-----------|
| `request` | `request(config)` or `request(url, config?)` |
| `get` / `delete` / `head` / `options` | `get(url, config?)` |
| `post` / `put` / `patch` | `post(url, body?, config?)` |

Each method resolves to `{ data, status, statusText, headers, ok, url, request, raw }`.
`raw` is the underlying fetch `Response`.

`body` handling: plain objects, arrays, numbers, and booleans are JSON-encoded with
`Content-Type: application/json`. `FormData`, `URLSearchParams`, `Blob`, strings, `ArrayBuffer`,
and streams are sent unchanged. For `FormData`, any preset `Content-Type` is removed so the browser
can set the multipart boundary.

Response bodies are read according to `Content-Type`: JSON types are parsed, `text/*` and XML
become a string, and other types become a `Blob`. Empty responses (204, `HEAD`) give
`undefined`. Set `responseType` (`'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream'`)
to override this.

## Options

Options can be set on the client (as defaults) or on a single request. Request options win;
`headers`, `params`, `retry`, and `context` merge key by key. Standard fetch options
(`credentials`, `cache`, `mode`, `redirect`, `keepalive`, `priority`, …) are passed through.

| Option | Default | Description |
|--------|---------|-------------|
| `baseURL` | — | Prefix for relative URLs. Absolute URLs ignore it. |
| `headers` | — | Plain object, `Headers`, or pairs. A `null` value removes a default header. |
| `params` | — | Query parameters. Arrays repeat the key; `null`/`undefined` are skipped; `Date`s are sent as ISO strings. |
| `paramsSerializer` | — | `(params) => string` for other formats such as `ids[]=1`. |
| `timeout` | `0` (none) | Milliseconds per attempt before failing with `ERR_TIMEOUT`. |
| `signal` | — | `AbortSignal` that cancels the request and any pending retry. |
| `retry` | off | `true`, a retry limit, or [retry options](#retries). |
| `schema` | — | Validates `data` and infers its type. See [typed responses](#typed-responses). |
| `validateStatus` | `2xx` | `(status) => boolean`: which statuses resolve. |
| `responseType` | `'auto'` | How the body is read. |
| `auth` | — | `{ username, password }` sent as HTTP Basic auth. |
| `xsrf` | `false` | `true` or `{ cookieName, headerName }`. Copies a CSRF cookie into a header on same-origin `POST`/`PUT`/`PATCH`/`DELETE` requests. |
| `onDownloadProgress` | — | `({ loaded, total, progress }) => void` |
| `parseJson` / `stringifyJson` | `JSON` | Custom JSON handling, e.g. a reviver that turns date strings into `Date`s. |
| `fetch` | global `fetch` | Custom implementation for tests, SSR, or instrumentation. |
| `context` | `{}` | Metadata for interceptors. It is never sent. |

## Errors

Every failure rejects with an `HttpError`: `status` and `data` read from the response, and
`code` says what happened:

| `code` | Meaning |
|--------|---------|
| `ERR_STATUS` | The server responded with a status that `validateStatus` rejected. `error.data` holds the parsed error body. |
| `ERR_NETWORK` | No response (offline, DNS, CORS, reset). The original error is in `error.cause`. |
| `ERR_TIMEOUT` | `timeout` elapsed. |
| `ERR_ABORTED` | The caller's `signal` aborted. |
| `ERR_PARSE` | A successful response had invalid JSON. |
| `ERR_VALIDATION` | `schema` rejected the body. `error.issues` lists the reasons. |

Use `isHttpError(error)` or `isHttpError(error, 'ERR_TIMEOUT')` as a type guard. `error.toJSON()` gives
a log-safe summary with no bodies or headers.

## Interceptors

`interceptors.request` runs before a request is sent. `interceptors.response` runs after a
response or an `HttpError`. Both run in the order they were registered, and `use()` returns a
function that removes the interceptor. A handler can change the value in place and return
nothing, or return a replacement. A response error handler can recover by returning a response.
If it throws or returns nothing, the error continues to the caller, so a handler that only logs
can't swallow a failure.

<!-- doc-check -->
```ts
import { createHttpClient } from '@willramdev/http';

const api = createHttpClient({ baseURL: '/api' });
let token = '';

api.interceptors.request.use((request) => {
  request.headers.set('Authorization', `Bearer ${token}`);
});

// Refresh an expired token once, then replay the original request.
const stop = api.interceptors.response.use(undefined, async (error) => {
  if (error.status !== 401 || error.request.context.retried) throw error;
  const { data } = await api.post('/auth/refresh');
  token = data.token;
  return api.request({ ...error.request, context: { retried: true } });
});

stop(); // unregister when no longer needed
```

Response error handlers only receive `HttpError`s. Other errors, such as a bug in an
interceptor, pass through untouched.

## Retries

`retry: true` retries idempotent requests (`GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`) up to 2
times on network errors and on 408, 413, 429, 500, 502, 503, and 504 responses. The delay
doubles each time (300 ms, 600 ms, …), and a `Retry-After` header takes precedence. `POST` is
never retried unless you list it.

```js
api.get('/feed', {
  retry: {
    limit: 3,
    methods: ['GET', 'POST'],
    statusCodes: [503],
    retryOnTimeout: true,
    delay: (attempt) => attempt * 1000,
    maxDelay: 5_000,
    // return true/false to decide, or undefined to use the rules above
    shouldRetry: ({ error }) => (error.data?.code === 'BUSY' ? true : undefined),
  },
});
```

Interceptors run once per call, not once per attempt. A request aborted with its `signal` is
never retried.

## Typed responses

The type of `data` comes from the call, so plain JavaScript and TypeScript use the same API:

<!-- doc-check -->
```ts
import { http } from '@willramdev/http';
import { z } from 'zod';

// 1. A Standard Schema (Zod, Valibot, ArkType, …) validates the response at runtime
//    and gives `data` its type.
const User = z.object({ id: z.number(), name: z.string() });
const { data: user } = await http.get('/api/me', { schema: User });
user.name; // string

// 2. A plain parser function works too. Its return type becomes `data`.
const { data: count } = await http.get('/api/count', { schema: (data) => Number(data) });
count.toFixed(0); // number

// 3. Or name the type with a generic (TypeScript only; no runtime check).
const { data: todo } = await http.get<{ title: string }>('/api/todo/1');
todo.title; // string

// With none of these, `data` is `any`, the same as `await res.json()`.
```

In JavaScript with `// @ts-check`, a JSDoc-typed parser gives the same inference:

```js
/** @typedef {{ id: number, name: string }} User */

/** @param {unknown} data @returns {User} */
const parseUser = (data) => /** @type {User} */ (data);

const { data: user } = await http.get('/api/me', { schema: parseUser }); // user: User
```

In development builds, misspelled or axios-style options (`data`, `baseUrl`, `query`,
`withCredentials`, …) log a one-time `[litkit]` warning that names the correct option. These
checks are removed from production builds.

## Instances

- `http` is a shared client with no base URL.
- `createHttpClient(config)` creates a client with its own defaults and interceptors.
- `client.extend(config)` creates a child client. It copies the parent's current defaults, merges
  `config` over them, and keeps running the parent's interceptors, including ones added later.
  Parent request interceptors run first and parent response interceptors run last.
- `client.defaults` can be changed at any time, e.g.
  `api.defaults.headers.set('Accept-Language', 'fr')`.

## Cancellation, timeouts, and progress

```js
const controller = new AbortController();
const pending = api.get('/report', {
  signal: controller.signal,
  timeout: 30_000,
  responseType: 'blob',
  onDownloadProgress: ({ progress }) => console.log(progress), // 0–1, or undefined if the size is unknown
});
controller.abort(); // rejects with ERR_ABORTED
```

Upload progress is not supported: `fetch` has no upload-progress events.

## With `@willramdev/query`

Pass TanStack Query's `signal` through so cancelled queries also abort the request:

```js
query({
  queryKey: ['user', id],
  queryFn: ({ signal }) => api.get(`/users/${id}`, { signal, schema: User }).then((res) => res.data),
});
```

## Coming from axios

| axios | @willramdev/http |
|-------|-----|
| `axios.create(config)` | `createHttpClient(config)` / `client.extend(config)` |
| `data` (request payload) | `body` |
| `interceptors.*.use()` returns an id for `eject(id)` | `use()` returns a function that removes the interceptor |
| error interceptors must `return Promise.reject(error)` | an error handler that returns nothing rethrows |
| request interceptors run last-registered first | all interceptors run in registration order |
| `withCredentials: true` | `credentials: 'include'` |
| `xsrfCookieName` / `xsrfHeaderName` | `xsrf: { cookieName, headerName }` (off by default) |
| `transformRequest` / `transformResponse` | interceptors, `stringifyJson`, `parseJson` |
| `onUploadProgress` | not supported by `fetch` |
| `axios.isAxiosError(e)` | `isHttpError(e)`, optionally `isHttpError(e, code)` |

## License

MIT

---

> See the [root README](../../README.md) for the monorepo map and the cross-package integration example.
