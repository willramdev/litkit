/**
 * The document-level fallback that makes late providers work. Internal.
 *
 * A subscribing request that no provider answers bubbles up to `document`,
 * where it is parked. When any provider announces itself with a
 * `context-provider` event for that context, the parked requests are
 * re-dispatched from their consumers and find it. Outer providers stop the
 * announcement from reaching here once they have re-parented their own
 * subscribers, which matches `@lit/context`'s `ContextRoot`.
 */

import { ContextRequestEvent, asRequest, sourceOf, type ProviderLike } from './events.ts';
import type { ContextCallback, UnknownContext } from './types.ts';

// Registered on the document under a global symbol, so two copies of kit (or a
// hot-reloaded module) share one root instead of replaying every request twice.
const ROOT_KEY = Symbol.for('litkit.context.root');

interface Parked {
  consumer: WeakRef<EventTarget>;
  callback: WeakRef<ContextCallback<unknown>>;
}

interface PendingRequests {
  // Dedupes a consumer that re-requests before any provider appears.
  seen: WeakMap<EventTarget, WeakSet<ContextCallback<unknown>>>;
  // Weak references: a parked consumer that is garbage-collected is simply dropped.
  requests: Parked[];
}

class ContextRoot {
  private _pending = new Map<unknown, PendingRequests>();

  onRequest = (event: Event): void => {
    const request = asRequest(event);
    // One-time requests can't be replayed: a provider must not keep their callback.
    if (!request || request.subscribe !== true) return;
    const consumer = sourceOf(request);
    if (!consumer) return;

    let pending = this._pending.get(request.context);
    if (!pending) {
      pending = { seen: new WeakMap(), requests: [] };
      this._pending.set(request.context, pending);
    }
    let callbacks = pending.seen.get(consumer);
    if (!callbacks) {
      callbacks = new WeakSet();
      pending.seen.set(consumer, callbacks);
    }
    if (callbacks.has(request.callback)) return;
    callbacks.add(request.callback);
    pending.requests.push({
      consumer: new WeakRef(consumer),
      callback: new WeakRef(request.callback),
    });
  };

  onProvider = (event: Event): void => {
    const { context } = event as Event & ProviderLike;
    const pending = this._pending.get(context);
    if (!pending) return;
    this._pending.delete(context);
    for (const parked of pending.requests) {
      const consumer = parked.consumer.deref();
      const callback = parked.callback.deref();
      if (!consumer || !callback) continue;
      // A consumer that left the page re-requests on its own when it reconnects.
      if ((consumer as Partial<Node>).isConnected === false) continue;
      // Unanswered replays bubble back up and are parked again.
      consumer.dispatchEvent(
        new ContextRequestEvent(context as UnknownContext, consumer, callback, true)
      );
    }
  };
}

/** Install the document-level root once. A no-op where there is no `document` (SSR, workers). */
export function ensureContextRoot(): void {
  if (typeof document === 'undefined') return;
  const doc = document as Document & { [ROOT_KEY]?: ContextRoot };
  if (doc[ROOT_KEY]) return;
  const root = new ContextRoot();
  document.addEventListener('context-request', root.onRequest);
  document.addEventListener('context-provider', root.onProvider);
  doc[ROOT_KEY] = root;
}
