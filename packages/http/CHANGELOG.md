# @willramdev/http

## 1.2.0

### Minor Changes

- 0c09c89: feat(http): new package `@willramdev/http`, a fetch-based HTTP client. It works in any JavaScript environment, with no framework dependency.

  - `createHttpClient()`, a shared `http` instance, and `client.extend()`.
  - Request and response interceptors run in registration order, and `use()` returns a function that removes the interceptor. An error handler that returns nothing rethrows the error, so a handler that only logs can't swallow a failure.
  - Plain objects are sent as JSON and responses are read by `Content-Type`.
  - `params` serialization and `baseURL`.
  - Timeouts, `AbortSignal` cancellation, and retries with exponential backoff that honor `Retry-After`.
  - Every failure is a single `HttpError` with a `code`: `ERR_STATUS`, `ERR_NETWORK`, `ERR_TIMEOUT`, `ERR_ABORTED`, `ERR_PARSE`, or `ERR_VALIDATION`.
  - A `schema` option (a Standard Schema such as Zod or Valibot, or a plain parser function) validates `response.data` and sets its type, so neither JavaScript nor TypeScript callers need generics.
  - Basic auth, opt-in XSRF cookie-to-header, and download progress.
  - Development-only warnings for axios-style or misspelled option names.
