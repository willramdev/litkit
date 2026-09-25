// Type-level contract for the HTTP client, enforced by `tsc --noEmit` (the
// package typecheck). Bodies are wrapped in `typecheck()` so no request is sent.
import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { createHttpClient, http } from './client.ts';
import { isHttpError, type HttpError } from './errors.ts';
import type { HttpResponse, HttpSchema } from './types.ts';
import { json, mockFetch } from './test-utils.ts';

const client = createHttpClient({ fetch: mockFetch(json({ id: 1, name: 'Ada' })) });

/** Compile-only: the callback is type-checked but never run. */
function typecheck(_body: () => unknown): void {}

describe('HTTP client types', () => {
  it('defaults data to any, like fetch().json(), so untyped calls stay frictionless', () =>
    typecheck(async () => {
      const res = await client.get('/users/1');
      expectTypeOf(res).toEqualTypeOf<HttpResponse<any>>();
    }));

  it('takes an explicit generic', () =>
    typecheck(async () => {
      const res = await client.get<{ id: number }>('/users/1');
      expectTypeOf(res.data).toEqualTypeOf<{ id: number }>();

      const created = await client.post<{ id: number }>('/users', { name: 'Ada' });
      expectTypeOf(created.data).toEqualTypeOf<{ id: number }>();
    }));

  it('infers data from a Zod schema with no generic', () =>
    typecheck(async () => {
      const User = z.object({ id: z.number(), name: z.string() });
      const res = await client.get('/users/1', { schema: User });
      expectTypeOf(res.data).toEqualTypeOf<{ id: number; name: string }>();
    }));

  it('infers the schema output type, not the input type', () =>
    typecheck(async () => {
      const Stamp = z.object({ at: z.string().transform((s) => new Date(s)) });
      const res = await client.get('/stamp', { schema: Stamp });
      expectTypeOf(res.data.at).toEqualTypeOf<Date>();
    }));

  it('infers data from a plain parser function', () =>
    typecheck(async () => {
      const res = await http.get('/count', { schema: (data) => Number(data) });
      expectTypeOf(res.data).toEqualTypeOf<number>();

      const asyncRes = await http.request({ url: '/flag', schema: async (data) => Boolean(data) });
      expectTypeOf(asyncRes.data).toEqualTypeOf<boolean>();
    }));

  it('infers from a schema on post/put/patch and request(url, config)', () =>
    typecheck(async () => {
      const Id = z.object({ id: z.number() });
      expectTypeOf((await client.post('/a', {}, { schema: Id })).data).toEqualTypeOf<{ id: number }>();
      expectTypeOf((await client.put('/a', {}, { schema: Id })).data).toEqualTypeOf<{ id: number }>();
      expectTypeOf((await client.patch('/a', {}, { schema: Id })).data).toEqualTypeOf<{ id: number }>();
      expectTypeOf((await client.request('/a', { schema: Id })).data).toEqualTypeOf<{ id: number }>();
    }));

  it('rejects a schema that contradicts an explicit generic', () =>
    typecheck(() => {
      const Id = z.object({ id: z.number() });
      // @ts-expect-error — the schema produces { id: number }, not string
      void client.get<string>('/a', { schema: Id });
    }));

  it('narrows errors with isHttpError', () =>
    typecheck(async () => {
      const error: unknown = await client.get('/a').catch((e: unknown) => e);
      if (isHttpError<{ message: string }>(error)) {
        expectTypeOf(error).toEqualTypeOf<HttpError<{ message: string }>>();
        expectTypeOf(error.data).toEqualTypeOf<{ message: string } | undefined>();
        expectTypeOf(error.status).toEqualTypeOf<number | undefined>();
      }
    }));

  it('types interceptor arguments without annotations', () =>
    typecheck(() => {
      client.interceptors.request.use((request) => {
        expectTypeOf(request.headers).toEqualTypeOf<Headers>();
        expectTypeOf(request.context).toEqualTypeOf<Record<string, unknown>>();
      });
      client.interceptors.response.use(
        (response) => {
          expectTypeOf(response.status).toEqualTypeOf<number>();
        },
        (error) => {
          expectTypeOf(error).toEqualTypeOf<HttpError>();
          throw error;
        }
      );
    }));

  it('accepts a Zod schema as an HttpSchema', () =>
    typecheck(() => {
      expectTypeOf(z.string()).toExtend<HttpSchema<string>>();
    }));
});
