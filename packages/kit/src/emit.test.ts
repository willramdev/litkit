import { describe, it, expect, vi } from 'vitest';
import { emit } from './emit.ts';

describe('emit', () => {
  it('dispatches a CustomEvent on the target', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('my-event', handler);

    emit(target, 'my-event');

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.type).toBe('my-event');
  });

  it('sets bubbles and composed to true by default', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('my-event', handler);

    emit(target, 'my-event');

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('passes detail', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('test', handler);

    emit(target, 'test', { foo: 'bar' });

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ foo: 'bar' });
  });

  it('allows overriding options', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    target.addEventListener('test', handler);

    emit(target, 'test', undefined, { bubbles: false, composed: false });

    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.bubbles).toBe(false);
    expect(event.composed).toBe(false);
  });

  it('returns the result of dispatchEvent', () => {
    const target = new EventTarget();
    const result = emit(target, 'test');
    expect(result).toBe(true);
  });

  it('returns false when event is cancelled', () => {
    const target = new EventTarget();
    target.addEventListener('test', (e) => e.preventDefault());

    const result = emit(target, 'test', undefined, { cancelable: true });
    expect(result).toBe(false);
  });
});
