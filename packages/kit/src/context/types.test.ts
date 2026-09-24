// Type-level contract for kit context, enforced by `tsc --noEmit` (the package
// typecheck). Bodies are wrapped in `typecheck()` so nothing runs.
import { describe, expectTypeOf, it } from 'vitest';
import { createContext as createLitContext, type ContextType as LitContextType } from '@lit/context';
import { consume, createContext, provide, requestContext } from './context.ts';
import type { Context, ContextConsumer, ContextProvider, ContextValue } from './types.ts';

interface Api {
  get(path: string): Promise<unknown>;
}

/** Compile-only: the callback is type-checked but never run. */
function typecheck(_body: () => unknown): void {}

const host = null as unknown as HTMLElement;

describe('context types', () => {
  it('infers the value type from defaultValue, with no generic', () =>
    typecheck(() => {
      const theme = createContext('theme', { defaultValue: 'light' as 'light' | 'dark' });
      expectTypeOf(theme).toEqualTypeOf<Context<'light' | 'dark', 'light' | 'dark'>>();
      expectTypeOf(consume(host, theme).value).toEqualTypeOf<'light' | 'dark'>();
      expectTypeOf(requestContext(host, theme)).toEqualTypeOf<'light' | 'dark'>();
    }));

  it('adds undefined for a context without a default', () =>
    typecheck(() => {
      const api = createContext<Api>('api');
      expectTypeOf(api).toEqualTypeOf<Context<Api>>();
      expectTypeOf<ContextValue<typeof api>>().toEqualTypeOf<Api | undefined>();
      expectTypeOf(consume(host, api)).toEqualTypeOf<ContextConsumer<Api | undefined>>();
    }));

  it('types provide() by the context and rejects a mismatched value', () =>
    typecheck(() => {
      const api = createContext<Api>('api');
      const client: Api = { get: async () => undefined };
      expectTypeOf(provide(host, api, client)).toEqualTypeOf<ContextProvider<Api>>();
      // @ts-expect-error — a string is not an Api
      provide(host, api, 'nope');
    }));

  it('types onChange arguments from the context', () =>
    typecheck(() => {
      const count = createContext('count', { defaultValue: 0 });
      consume(host, count, {
        onChange(value, previous) {
          expectTypeOf(value).toEqualTypeOf<number>();
          expectTypeOf(previous).toEqualTypeOf<number>();
        },
      });
    }));

  it('accepts @lit/context keys, adding undefined since they carry no default', () =>
    typecheck(() => {
      const litKey = createLitContext<number>('lit-count');
      expectTypeOf(consume(host, litKey).value).toEqualTypeOf<number | undefined>();
      expectTypeOf(provide(host, litKey, 1)).toEqualTypeOf<ContextProvider<number>>();
    }));

  it('exposes kit contexts to @lit/context type helpers', () =>
    typecheck(() => {
      const api = createContext<Api>('api');
      expectTypeOf<LitContextType<typeof api>>().toEqualTypeOf<Api>();
    }));
});
