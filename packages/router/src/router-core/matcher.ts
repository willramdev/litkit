import type { MatcherFactory, RouteMatcher } from "./types.ts";
import { CompiledPathMatcher } from "./compiled-matcher.ts";
import { URLPatternMatcher } from "./url-pattern-matcher.ts";

/**
 * Runtime check for native URLPattern support.
 */
export const supportsURLPattern: boolean =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as Record<string, unknown>).URLPattern === "function";

/**
 * Creates a matcher using the native URLPattern API.
 * Throws if URLPattern is not available.
 */
export const urlPatternMatcherFactory: MatcherFactory = (pattern: string): RouteMatcher => {
  return new URLPatternMatcher(pattern);
};

/**
 * Creates a matcher using the compiled regex fallback.
 * Works in all browsers.
 */
export const compiledMatcherFactory: MatcherFactory = (pattern: string): RouteMatcher => {
  return new CompiledPathMatcher(pattern);
};

/**
 * Auto-detect the best matcher factory for the current environment.
 * Uses URLPattern when available, falls back to compiled regex.
 */
export function autoMatcherFactory(): MatcherFactory {
  return supportsURLPattern ? urlPatternMatcherFactory : compiledMatcherFactory;
}
