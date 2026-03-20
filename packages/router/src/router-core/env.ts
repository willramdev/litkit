/**
 * True when running in a browser-like environment with window, history, and document.
 */
export const isBrowser: boolean =
  typeof window !== "undefined" &&
  typeof window.history !== "undefined" &&
  typeof document !== "undefined";
