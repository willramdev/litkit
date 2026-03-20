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
