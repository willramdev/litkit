/** Dispatches a `CustomEvent` with `bubbles: true` and `composed: true` by default. */
export function emit(
  el: EventTarget,
  name: string,
  detail?: unknown,
  options?: Partial<CustomEventInit>
): boolean {
  return el.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail,
      ...options,
    })
  );
}
