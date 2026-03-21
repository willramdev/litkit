import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce.ts';

describe('@debounce', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('delays invocation by the specified ms', () => {
    const spy = vi.fn();
    class T {
      @debounce(100)
      run() { spy(); }
    }
    const t = new T();
    t.run();
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('resets the timer on repeated calls', () => {
    const spy = vi.fn();
    class T {
      @debounce(100)
      run() { spy(); }
    }
    const t = new T();
    t.run();
    vi.advanceTimersByTime(50);
    t.run();
    vi.advanceTimersByTime(50);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original method', () => {
    const spy = vi.fn();
    class T {
      @debounce(50)
      run(a: number, b: string) { spy(a, b); }
    }
    const t = new T();
    t.run(1, 'hello');
    vi.advanceTimersByTime(50);
    expect(spy).toHaveBeenCalledWith(1, 'hello');
  });

  it('preserves `this` context', () => {
    class T {
      value = 42;
      result = 0;
      @debounce(50)
      run() { this.result = this.value; }
    }
    const t = new T();
    t.run();
    vi.advanceTimersByTime(50);
    expect(t.result).toBe(42);
  });

  it('isolates timers between instances', () => {
    const spy = vi.fn();
    class T {
      @debounce(100)
      run() { spy(this); }
    }
    const a = new T();
    const b = new T();
    a.run();
    vi.advanceTimersByTime(50);
    b.run();
    vi.advanceTimersByTime(50);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(a);
    vi.advanceTimersByTime(50);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(b);
  });
});
