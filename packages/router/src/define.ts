import { devWarnOnce } from './internal/dev.ts';

/** Idempotent `customElements.define` — safe to call multiple times with the same tag. */
export function define(
  tag: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  const existing = customElements.get(tag);
  if (existing) {
    // Warn only on a genuine tag COLLISION (a different constructor). A
    // same-constructor idempotent re-call (SSR re-entry, HMR, repeat imports)
    // is the designed, correct usage and stays completely silent.
    devWarnOnce(
      `dup:${tag}`,
      `define("${tag}"): a different element is already registered for this tag; the new registration was ignored.`,
      existing !== ctor
    );
    return;
  }
  customElements.define(tag, ctor, options);
}
