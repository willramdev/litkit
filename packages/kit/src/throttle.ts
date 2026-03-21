/** Method decorator that throttles invocations to at most once per `ms` milliseconds. */
export function throttle(ms: number) {
  const lastRun = new WeakMap<object, number>();
  const pending = new WeakMap<object, ReturnType<typeof setTimeout>>();
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value;
    descriptor.value = function (this: object, ...args: unknown[]) {
      const now = Date.now();
      const last = lastRun.get(this) ?? 0;
      const remaining = ms - (now - last);

      const existingTimer = pending.get(this);
      if (existingTimer !== undefined) clearTimeout(existingTimer);

      if (remaining <= 0) {
        lastRun.set(this, now);
        original.apply(this, args);
      } else {
        pending.set(
          this,
          setTimeout(() => {
            lastRun.set(this, Date.now());
            pending.delete(this);
            original.apply(this, args);
          }, remaining),
        );
      }
    };
  };
}
