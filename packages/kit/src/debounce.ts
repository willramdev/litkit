/** Method decorator that debounces invocations by `ms` milliseconds. */
export function debounce(ms: number) {
  const timers = new WeakMap<object, ReturnType<typeof setTimeout>>();
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value;
    descriptor.value = function (this: object, ...args: unknown[]) {
      const existing = timers.get(this);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(
        this,
        setTimeout(() => {
          timers.delete(this);
          original.apply(this, args);
        }, ms),
      );
    };
  };
}
