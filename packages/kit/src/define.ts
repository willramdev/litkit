export function define(
  tag: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor, options);
  }
}
