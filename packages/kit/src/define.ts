/** Idempotent `customElements.define` — safe to call multiple times with the same tag. */
export function define(
  tag: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor, options);
  }
}
