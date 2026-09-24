// Shared fetch mocks for the HTTP client tests. Not exported from the package.
import { vi } from 'vitest';
import { HttpError } from './errors.ts';

export type Reply = Response | Error | ((url: string, init: RequestInit) => Response | Promise<Response>);

/** A fetch mock that answers each call with the next reply; the last reply repeats. */
export function mockFetch(...replies: Reply[]) {
  let index = 0;
  return vi.fn(async (url: string, init: RequestInit): Promise<Response> => {
    const reply = replies[Math.min(index++, replies.length - 1)];
    if (reply instanceof Error) throw reply;
    if (typeof reply === 'function') return reply(url, init);
    return reply.clone();
  });
}

/** A JSON response. */
export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

/** A fetch mock that never resolves until its signal aborts, then rejects like real fetch. */
export function hangingFetch() {
  return vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        if (!signal) return;
        signal.addEventListener('abort', () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError')), {
          once: true,
        });
      })
  );
}

/** The `RequestInit` of the n-th call to a fetch mock. */
export function initOf(fetch: ReturnType<typeof vi.fn>, call = 0): RequestInit {
  return fetch.mock.calls[call][1] as RequestInit;
}

/** The headers of the n-th call to a fetch mock. */
export function headersOf(fetch: ReturnType<typeof vi.fn>, call = 0): Headers {
  return new Headers(initOf(fetch, call).headers);
}

/** `.then(shouldNotResolve, asHttpError)` turns an expected rejection into a typed value. */
export function shouldNotResolve(value: unknown): never {
  throw new Error(`Expected the request to fail, but it resolved with ${String(value)}`);
}

/** Narrow a rejection to `HttpError`, rethrowing anything else. */
export function asHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  throw error;
}
