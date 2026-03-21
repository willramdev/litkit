import { describe, it, expect } from 'vitest';
import { bind } from './bind.ts';

describe('bind decorator', () => {
  it('binds method to the instance', () => {
    class Foo {
      name = 'foo';

      @bind()
      greet() {
        return this.name;
      }
    }

    const foo = new Foo();
    const { greet } = foo;
    expect(greet()).toBe('foo');
  });

  it('caches the bound method on the instance', () => {
    class Foo {
      @bind()
      doStuff() {}
    }

    const foo = new Foo();
    const first = foo.doStuff;
    const second = foo.doStuff;
    expect(first).toBe(second);
  });

  it('different instances get different bound methods', () => {
    class Foo {
      name: string;
      constructor(name: string) {
        this.name = name;
      }

      @bind()
      getName() {
        return this.name;
      }
    }

    const a = new Foo('a');
    const b = new Foo('b');
    const getA = a.getName;
    const getB = b.getName;

    expect(getA()).toBe('a');
    expect(getB()).toBe('b');
    expect(getA).not.toBe(getB);
  });
});
