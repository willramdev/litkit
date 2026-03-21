import { describe, it, expect, vi } from 'vitest';
import { computed } from './computed.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('computed (no deps)', () => {
  it('computes value lazily on first access', () => {
    const host = createMockHost();
    const fn = vi.fn(() => 42);
    const c = computed(host as any, fn);

    expect(fn).not.toHaveBeenCalled();
    expect(c.value).toBe(42);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('recomputes on hostUpdate', () => {
    const host = createMockHost();
    let count = 0;
    const c = computed(host as any, () => ++count);

    expect(c.value).toBe(1);
    c.hostUpdate();
    expect(c.value).toBe(2);
  });

  it('registers itself as a controller', () => {
    const host = createMockHost();
    const c = computed(host as any, () => 0);
    expect(host.addController).toHaveBeenCalledWith(c);
  });
});

describe('computed (with deps)', () => {
  it('computes from deps on first access', () => {
    const host = createMockHost();
    const c = computed(
      host as any,
      () => [2, 3] as const,
      ([a, b]) => a + b,
    );

    expect(c.value).toBe(5);
  });

  it('skips recomputation when deps are equal', () => {
    const host = createMockHost();
    const computeFn = vi.fn(([a, b]: readonly [number, number]) => a * b);
    const deps = [3, 4] as [number, number];
    const c = computed(
      host as any,
      () => deps,
      computeFn,
    );

    expect(c.value).toBe(12);
    expect(computeFn).toHaveBeenCalledOnce();

    c.hostUpdate();
    expect(c.value).toBe(12);
    // Called twice: initial + hostUpdate (deps equal so shouldn't recompute)
    // Actually the deps array reference is the same, so values are equal
    expect(computeFn).toHaveBeenCalledOnce();
  });

  it('recomputes when deps change', () => {
    const host = createMockHost();
    let x = 1;
    const c = computed(
      host as any,
      () => [x] as const,
      ([val]) => val * 10,
    );

    expect(c.value).toBe(10);

    x = 5;
    c.hostUpdate();
    expect(c.value).toBe(50);
  });

  it('handles deps length changes', () => {
    const host = createMockHost();
    let items = [1, 2];
    const c = computed(
      host as any,
      () => [items.length] as const,
      ([len]) => len,
    );

    expect(c.value).toBe(2);

    items = [1, 2, 3];
    c.hostUpdate();
    expect(c.value).toBe(3);
  });
});
