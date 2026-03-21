import type { Router } from "../router-core/types.ts";

/** Custom event name used to request a `Router` from the DOM context. */
export const LIT_ROUTER_REQUEST = "lit-router:request";

type RouterRequestDetail = {
  respond: (router: Router) => void;
};

function isRouterRequestEvent(
  event: Event,
): event is CustomEvent<RouterRequestDetail> {
  return event.type === LIT_ROUTER_REQUEST;
}

/** Dispatches a context-request event to resolve a `Router` from an ancestor provider. */
export function requestRouter(target: EventTarget): Router | undefined {
  let resolved: Router | undefined;

  target.dispatchEvent(
    new CustomEvent<RouterRequestDetail>(LIT_ROUTER_REQUEST, {
      bubbles: true,
      composed: true,
      detail: {
        respond(router) {
          resolved = router;
        },
      },
    }),
  );

  return resolved;
}

/** Attaches a `Router` provider to a DOM element. Returns a cleanup function. */
export function attachRouterProvider(
  target: EventTarget,
  getRouter: () => Router,
): () => void {
  const listener = (event: Event) => {
    if (!isRouterRequestEvent(event)) return;
    event.detail.respond(getRouter());
    event.stopPropagation();
  };

  target.addEventListener(LIT_ROUTER_REQUEST, listener);
  return () => {
    target.removeEventListener(LIT_ROUTER_REQUEST, listener);
  };
}
