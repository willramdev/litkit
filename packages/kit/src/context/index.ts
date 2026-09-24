/**
 * `@willramdev/kit/context` — pass values (a router, an API client, a theme)
 * from an element to its descendants without threading them through every
 * layer. Implements the web-components Context Protocol, so it interoperates
 * with `@lit/context`. Framework-neutral: this entry has no Lit dependency.
 * Also re-exported from `@willramdev/kit`.
 *
 * @module
 */

export { createContext, provide, consume, requestContext, subscribeContext } from './context.ts';
export { ContextRequestEvent, ContextProviderEvent } from './events.ts';

export type {
  Context,
  ContextCallback,
  ContextConsumer,
  ContextProvider,
  ContextType,
  ContextValue,
  ConsumeOptions,
  UnknownContext,
} from './types.ts';
