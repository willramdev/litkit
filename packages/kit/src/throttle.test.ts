import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from './throttle.ts';

describe('@throttle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('fires immediately on first call', () => {
    const spy = vi.fn();
    class T {
      @throttle(100)
      run() { spy(); }
    }
    const t = new T();
    t.run();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('defers subsequent calls within the window', () => {
    const spy = vi.fn();
    class T {
      @throttle(100)
      run() { spy(); }
    }
    const t = new T();
    t.run(); // fires immediately
    t.run(); // queued
    expect(spy).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('allows a new immediate call after the window', () => {
    const spy = vi.fn();
    class T {
      @throttle(100)
      run() { spy(); }
    }
    const t = new T();
    t.run();
    vi.advanceTimersByTime(100);
    t.run(); // should fire immediately
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to the original method', () => {
    const spy = vi.fn();
    class T {
      @throttle(100)
      run(x: number) { spy(x); }
    }
    const t = new T();
    t.run(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('uses the latest arguments for the trailing call', () => {
    const spy = vi.fn();
    class T {
      @throttle(100)
      run(x: number) { spy(x); }
    }
    const t = new T();
    t.run(1); // fires immediately with 1
    t.run(2); // queued
    t.run(3); // replaces queued, now 3
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
  });

  it('preserves `this` context', () => {
    class T {
      value = 42;
      result = 0;
      @throttle(100)
      run() { this.result = this.value; }
    }
    const t = new T();
    t.run();
    expect(t.result).toBe(42);
  });

  it('isolates state between instances', () => {
    const spy = vi.fn();
    class T {
      @throttle(100)
      run() { spy(this); }
    }
    const a = new T();
    const b = new T();
    a.run(); // fires immediately
    b.run(); // fires immediately (different instance)
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
