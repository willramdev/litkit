import {
  ContextProviderEvent,
  requestContext,
  subscribeContext,
  type ContextRequestEvent,
} from "@willramdev/kit/context";
import type { Router } from "../router-core/types.ts";

/** Type of {@link routerContext}: a Context Protocol key for a `Router`. */
export type RouterContext = symbol & { readonly __context__: Router };

/**
 * The context key `<router-provider>` provides its `Router` under. Use it with
 * `consume`, `provide`, `subscribeContext`, or `requestContext` from
 * `@willramdev/kit/context`, or with `@lit/context`.
 *
 * It is a `Symbol.for` key rather than a unique one because this package ships
 * separate self-contained bundles (the main entry and `/lit`): every copy must
 * agree on the key for a provider from one to answer a consumer from another.
 */
export const routerContext = Symbol.for("@willramdev/router:router") as RouterContext;

/**
 * Event name of the pre-context-protocol router request.
 * @deprecated Use `routerContext`. `<router-provider>` still answers this
 * event in 1.x; it will be removed in 2.0.
 */
export const LIT_ROUTER_REQUEST = "lit-router:request";

type RouterRequestDetail = {
  respond: (router: Router) => void;
};

function isRouterRequestEvent(
  event: Event,
): event is CustomEvent<RouterRequestDetail> {
  return event.type === LIT_ROUTER_REQUEST;
}

function requestLegacyRouter(target: EventTarget): Router | undefined {
  let resolved: Router | undefined;
  if (typeof target.dispatchEvent !== "function") return resolved;
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

/**
 * Answer the legacy `lit-router:request` event while `getRouter` returns a
 * router; otherwise let the request pass. Internal; removed in 2.0.
 */
export function answerLegacyRouterRequests(
  target: EventTarget,
  getRouter: () => Router | undefined,
): () => void {
  const listener = (event: Event) => {
    if (!isRouterRequestEvent(event)) return;
    const router = getRouter();
    if (!router) return;
    event.detail.respond(router);
    event.stopPropagation();
  };
  target.addEventListener(LIT_ROUTER_REQUEST, listener);
  return () => target.removeEventListener(LIT_ROUTER_REQUEST, listener);
}

/**
 * Resolve the `Router` from the nearest provider above `target`, once. Also
 * finds providers that only answer the legacy `lit-router:request` event.
 */
export function requestRouter(target: EventTarget): Router | undefined {
  return requestContext(target, routerContext) ?? requestLegacyRouter(target);
}

/**
 * Follow the `Router` from the nearest provider above `target`: `callback`
 * runs now if one answers, and again when the router is replaced, a provider
 * appears later, or a nearer one takes over. Falls back to a one-time legacy
 * lookup. Returns a function that stops following. Internal.
 */
export function watchRouter(
  target: EventTarget,
  callback: (router: Router) => void,
): () => void {
  let answered = false;
  const stop = subscribeContext(target, routerContext, (router) => {
    answered = true;
    callback(router);
  });
  if (!answered) {
    const legacy = requestLegacyRouter(target);
    if (legacy) callback(legacy);
  }
  return stop;
}

/**
 * Make `target` provide a `Router` to its descendants. `getRouter` is read on
 * each request. Returns a cleanup function.
 *
 * @deprecated Use `provide(target, routerContext, router)` from
 * `@willramdev/kit/context`, which also updates consumers when the router is
 * replaced. Will be removed in 2.0.
 */
export function attachRouterProvider(
  target: EventTarget,
  getRouter: () => Router,
): () => void {
  // Answers each request with the router of the moment. It keeps no
  // subscribers, so consumers see a replaced router only when they re-request.
  const listener = (event: Event) => {
    const request = event as ContextRequestEvent<RouterContext>;
    if (request.context !== routerContext) return;
    if ((request.contextTarget ?? event.composedPath()[0]) === target) return;
    event.stopImmediatePropagation();
    request.callback(getRouter());
  };
  target.addEventListener("context-request", listener);
  const detachLegacy = answerLegacyRouterRequests(target, getRouter);
  // Announce, so consumers that asked before this provider existed resolve now.
  target.dispatchEvent(new ContextProviderEvent(routerContext, target));
  return () => {
    target.removeEventListener("context-request", listener);
    detachLegacy();
  };
}
