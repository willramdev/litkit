// Shared vitest setup: installs inert stubs for browser globals that jsdom omits
// (ResizeObserver, IntersectionObserver) plus a guarded matchMedia shim.
// Referenced from each package's `test.setupFiles`. erasableSyntaxOnly: explicit
// class fields only, no constructor parameter properties.
//
// These stubs are INERT — they never fire callbacks. Controller tests should
// assert construction/lifecycle (host.addController called, disconnect() on
// hostDisconnected), NOT that a resize/intersection callback fires. To assert
// callback behavior, spy on the constructed observer instance instead.

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class MockIntersectionObserver {
  root: Element | null = null;
  rootMargin = '';
  thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Guard: a node-environment package importing this setup must not crash on the
// missing `window`. matchMedia is only stubbed when jsdom provides `window` and
// hasn't already supplied an implementation.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    })) as unknown as typeof window.matchMedia;
  }
}
