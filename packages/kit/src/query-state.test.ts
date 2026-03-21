import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryState } from './query-state.ts';

function createMockHost() {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('queryState', () => {
  beforeEach(() => {
    // Reset URL to clean state
    window.history.replaceState({}, '', window.location.pathname);
  });

  it('reads default when param is not in URL', () => {
    const host = createMockHost();
    const state = queryState(host as any, 'page', { default: 1, parse: Number });
    expect(state.value).toBe(1);
  });

  it('reads param value from URL', () => {
    window.history.replaceState({}, '', '?page=5');
    const host = createMockHost();
    const state = queryState(host as any, 'page', { default: 1, parse: Number });
    expect(state.value).toBe(5);
  });

  it('writes value to URL on set', () => {
    const host = createMockHost();
    const state = queryState(host as any, 'q', { default: '' });
    state.value = 'search';

    const url = new URL(window.location.href);
    expect(url.searchParams.get('q')).toBe('search');
  });

  it('removes param from URL when value equals default', () => {
    window.history.replaceState({}, '', '?q=hello');
    const host = createMockHost();
    const state = queryState(host as any, 'q', { default: 'hello' });

    state.value = 'hello';
    const url = new URL(window.location.href);
    expect(url.searchParams.has('q')).toBe(false);
  });

  it('requests host update on set', () => {
    const host = createMockHost();
    const state = queryState(host as any, 'q', { default: '' });
    state.value = 'test';
    expect(host.requestUpdate).toHaveBeenCalledOnce();
  });

  it('uses custom serialize', () => {
    const host = createMockHost();
    const state = queryState(host as any, 'flag', {
      default: false,
      serialize: (v) => (v ? '1' : '0'),
    });

    state.value = true;
    const url = new URL(window.location.href);
    expect(url.searchParams.get('flag')).toBe('1');
  });

  it('uses custom parse', () => {
    window.history.replaceState({}, '', '?flag=1');
    const host = createMockHost();
    const state = queryState(host as any, 'flag', {
      default: false,
      parse: (raw) => raw === '1',
    });
    expect(state.value).toBe(true);
  });

  it('registers as a controller', () => {
    const host = createMockHost();
    const state = queryState(host as any, 'q', { default: '' });
    expect(host.addController).toHaveBeenCalledWith(state);
  });

  it('re-reads value on popstate', () => {
    const host = createMockHost();
    const state = queryState(host as any, 'q', { default: '' });

    state.hostConnected();
    host.requestUpdate.mockClear();

    window.history.replaceState({}, '', '?q=popped');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(state.value).toBe('popped');
    expect(host.requestUpdate).toHaveBeenCalled();

    state.hostDisconnected();
  });
});
