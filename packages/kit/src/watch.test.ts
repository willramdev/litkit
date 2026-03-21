import { describe, it, expect } from 'vitest';
import { watch, WATCHERS } from './watch.ts';
import type { WatchEntry } from './watch.ts';

describe('watch decorator', () => {
  it('adds watcher metadata to the prototype', () => {
    class Foo {
      @watch('name')
      onNameChange() {}
    }

    const watchers = (Foo.prototype as any)[WATCHERS] as WatchEntry[];
    expect(watchers).toHaveLength(1);
    expect(watchers[0]).toEqual({ props: ['name'], method: 'onNameChange' });
  });

  it('supports multiple prop names', () => {
    class Foo {
      @watch('first', 'last')
      onNameChange() {}
    }

    const watchers = (Foo.prototype as any)[WATCHERS] as WatchEntry[];
    expect(watchers[0].props).toEqual(['first', 'last']);
  });

  it('supports multiple watchers on the same class', () => {
    class Foo {
      @watch('a')
      onA() {}

      @watch('b')
      onB() {}
    }

    const watchers = (Foo.prototype as any)[WATCHERS] as WatchEntry[];
    expect(watchers).toHaveLength(2);
  });

  it('does not pollute parent prototype', () => {
    class Base {
      @watch('x')
      onX() {}
    }

    class Child extends Base {
      @watch('y')
      onY() {}
    }

    const baseWatchers = (Base.prototype as any)[WATCHERS] as WatchEntry[];
    const childWatchers = (Child.prototype as any)[WATCHERS] as WatchEntry[];

    expect(baseWatchers).toHaveLength(1);
    expect(childWatchers).toHaveLength(1);
    expect(baseWatchers[0].method).toBe('onX');
    expect(childWatchers[0].method).toBe('onY');
  });
});
