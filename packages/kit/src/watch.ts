export const WATCHERS = Symbol('kitWatchers');

export interface WatchEntry {
  props: string[];
  method: string;
}

/** Decorator that calls the method when any of the specified reactive properties change. */
export function watch(...propNames: string[]) {
  return function (proto: object, methodName: string) {
    const p = proto as Record<symbol, WatchEntry[]>;
    if (!Object.prototype.hasOwnProperty.call(p, WATCHERS)) {
      p[WATCHERS] = [];
    }
    p[WATCHERS].push({ props: propNames, method: methodName });
  };
}
