import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachQueryDevtools } from './query-devtools.ts';

// esm-env resolves DEV to true under the default vitest/dev environment, so the
// attach fn takes its active (non-no-op) path here without any override. The
// DEV-false no-op is exercised with a scoped module mock in its own test below.

// Hoisted shared spies so the vi.mock factory (hoisted above imports) and the
// tests observe the SAME TanstackQueryDevtools mount/unmount/ctor calls and the
// SAME fake onlineManager the implementation lazy-imports from @tanstack/query-core.
const hoisted = vi.hoisted(() => ({
  ctor: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn(),
  onlineManager: { __fake: 'onlineManager' } as const,
}));

// The lazy `await import('@tanstack/query-devtools')` resolves to this fake class
// (spies on construct/mount/unmount). No real panel is mounted in the node env.
vi.mock('@tanstack/query-devtools', () => {
  class TanstackQueryDevtools {
    constructor(config: unknown) {
      hoisted.ctor(config);
    }
    mount(el: unknown): void {
      hoisted.mount(el);
    }
    unmount(): void {
      hoisted.unmount();
    }
  }
  return { TanstackQueryDevtools };
});

// The lazy `await import('@tanstack/query-core')` resolves to a fake exposing the
// onlineManager the ctor config must carry (identity-checked below).
vi.mock('@tanstack/query-core', () => ({ onlineManager: hoisted.onlineManager }));

// devtools tests run on the default node environment (no DOM), so there is no
// ambient `document`. Provide a minimal fake whose createElement returns a node
// with a remove() spy and whose body tracks appended children, so the attach
// fn's host-div create/append/remove lifecycle is fully observable.
interface FakeNode {
  tagName: string;
  remove: ReturnType<typeof vi.fn>;
}
function makeFakeDocument() {
  const children: FakeNode[] = [];
  const body = {
    children,
    appendChild(node: FakeNode): FakeNode {
      children.push(node);
      return node;
    },
  };
  const createElement = vi.fn((tag: string): FakeNode => {
    const node: FakeNode = {
      tagName: tag,
      remove: vi.fn(() => {
        const idx = children.indexOf(node);
        if (idx >= 0) children.splice(idx, 1);
      }),
    };
    return node;
  });
  return { body, createElement };
}
function installDocument(doc: unknown): void {
  vi.stubGlobal('document', doc);
}

// Flush the microtask/task queue so the async lazy-import IIFE resolves.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// A minimal fake QueryClient — the panel is mocked, so no real client API is used.
const fakeClient = {} as import('@tanstack/query-core').QueryClient;

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('attachQueryDevtools — mount path (D-05, DTOOL-03)', () => {
  it('creates one host div, appends it to document.body, and lazy-mounts the panel bound to the client', async () => {
    const doc = makeFakeDocument();
    installDocument(doc);

    const teardown = attachQueryDevtools(fakeClient);

    // Host div is created and appended synchronously (before the lazy import).
    expect(doc.createElement).toHaveBeenCalledWith('div');
    expect(doc.body.children).toHaveLength(1);
    const host = doc.body.children[0];

    // Mount is async (lazy import) — wait for the IIFE to resolve.
    await vi.waitFor(() => expect(hoisted.mount).toHaveBeenCalledTimes(1));

    // Constructed with exactly { client, queryFlavor, version, onlineManager }.
    expect(hoisted.ctor).toHaveBeenCalledTimes(1);
    expect(hoisted.ctor).toHaveBeenCalledWith({
      client: fakeClient,
      queryFlavor: 'Lit Query',
      version: '5',
      onlineManager: hoisted.onlineManager,
    });
    // .mount(host) was called with the same host div appended to the body.
    expect(hoisted.mount).toHaveBeenCalledWith(host);

    teardown();
  });

  it('teardown unmounts the panel and removes the host (no leftover DOM node)', async () => {
    const doc = makeFakeDocument();
    installDocument(doc);

    const teardown = attachQueryDevtools(fakeClient);
    await vi.waitFor(() => expect(hoisted.mount).toHaveBeenCalledTimes(1));
    const host = doc.body.children[0];

    teardown();

    expect(hoisted.unmount).toHaveBeenCalledTimes(1);
    expect(host.remove).toHaveBeenCalledTimes(1);
    expect(doc.body.children).toHaveLength(0);
  });
});

describe('attachQueryDevtools — teardown edges (DTOOL-01)', () => {
  it('early teardown (before the lazy import resolves) mounts nothing but still removes the host', async () => {
    const doc = makeFakeDocument();
    installDocument(doc);

    const teardown = attachQueryDevtools(fakeClient);
    // Dispose immediately, before the async IIFE resumes past its awaits.
    const host = doc.body.children[0];
    teardown();

    // Let the pending lazy import settle — the disposed flag must prevent a mount.
    await flush();

    expect(hoisted.mount).not.toHaveBeenCalled();
    expect(hoisted.unmount).not.toHaveBeenCalled();
    expect(host.remove).toHaveBeenCalledTimes(1);
    expect(doc.body.children).toHaveLength(0);
  });

  it('calling the teardown a second time does not throw (idempotent)', async () => {
    const doc = makeFakeDocument();
    installDocument(doc);

    const teardown = attachQueryDevtools(fakeClient);
    await vi.waitFor(() => expect(hoisted.mount).toHaveBeenCalledTimes(1));

    teardown();
    expect(() => teardown()).not.toThrow();
  });
});

describe('attachQueryDevtools — no-op guards (D-04, DTOOL-01)', () => {
  it('is a silent no-op returning a valid teardown when document is undefined (SSR)', async () => {
    installDocument(undefined);

    const teardown = attachQueryDevtools(fakeClient);

    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();

    await flush();
    expect(hoisted.mount).not.toHaveBeenCalled();
  });

  it('is a silent no-op when DEV is false (never creates a host or mounts)', async () => {
    vi.resetModules();
    vi.doMock('./internal/dev.ts', () => ({ DEV: false }));
    const { attachQueryDevtools: gated } = await import('./query-devtools.ts');

    const doc = makeFakeDocument();
    installDocument(doc);

    const teardown = gated(fakeClient);

    expect(doc.createElement).not.toHaveBeenCalled();
    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();

    await flush();
    expect(hoisted.mount).not.toHaveBeenCalled();

    vi.doUnmock('./internal/dev.ts');
  });
});
