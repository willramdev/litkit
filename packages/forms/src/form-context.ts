import {
  ContextProviderEvent,
  requestContext,
  type ContextRequestEvent,
} from '@willramdev/kit/context';
import type { FormInstance } from './types.ts';

/** Type of {@link formContext}: a Context Protocol key for a `FormInstance`. */
export type FormContext = symbol & { readonly __context__: FormInstance<any> };

/**
 * The context key `<lit-form>` provides its `FormInstance` under. Use it with
 * `consume`, `provide`, `subscribeContext`, or `requestContext` from
 * `@willramdev/kit/context`, or with `@lit/context`.
 *
 * A `Symbol.for` key, so two installed copies of this package still agree.
 */
export const formContext = Symbol.for('@willramdev/forms:form') as FormContext;

/**
 * Event name of the pre-context-protocol form request.
 * @deprecated Use `formContext`. `<lit-form>` still answers this event in 1.x;
 * it will be removed in 2.0.
 */
export const LIT_FORM_REQUEST = 'lit-form:request-form';

type FormRequestDetail = {
  respond: (form: FormInstance<any>) => void;
};

function isFormRequestEvent(event: Event): event is CustomEvent<FormRequestDetail> {
  return event.type === LIT_FORM_REQUEST;
}

function requestLegacyFormContext(target: EventTarget): FormInstance<any> | undefined {
  let resolvedForm: FormInstance<any> | undefined;
  if (typeof target.dispatchEvent !== 'function') return resolvedForm;

  target.dispatchEvent(
    new CustomEvent<FormRequestDetail>(LIT_FORM_REQUEST, {
      bubbles: true,
      composed: true,
      detail: {
        respond(form) {
          resolvedForm = form;
        },
      },
    }),
  );

  return resolvedForm;
}

/**
 * Answer the legacy `lit-form:request-form` event while `getForm` returns a
 * form; otherwise let the request pass. Internal; removed in 2.0.
 */
export function answerLegacyFormRequests(
  target: EventTarget,
  getForm: () => FormInstance<any> | null | undefined,
): () => void {
  const listener = (event: Event) => {
    if (!isFormRequestEvent(event)) {
      return;
    }

    const form = getForm();
    if (!form) {
      return;
    }

    event.detail.respond(form);
    event.stopPropagation();
  };

  target.addEventListener(LIT_FORM_REQUEST, listener);

  return () => {
    target.removeEventListener(LIT_FORM_REQUEST, listener);
  };
}

/**
 * Resolve the `FormInstance` from the nearest `<lit-form>` (or other provider)
 * above `target`, once. Also finds providers that only answer the legacy
 * `lit-form:request-form` event.
 */
export function requestFormContext(target: EventTarget): FormInstance<any> | undefined {
  return requestContext(target, formContext) ?? requestLegacyFormContext(target);
}

/**
 * Make `target` provide a `FormInstance` to its descendants. `getForm` is read
 * on each request; while it returns nothing, requests pass to outer providers.
 * Returns a cleanup function.
 *
 * @deprecated Use `provide(target, formContext, form)` from
 * `@willramdev/kit/context`, which also updates subscribed consumers when the
 * form is replaced. Will be removed in 2.0.
 */
export function attachFormProvider(
  target: EventTarget,
  getForm: () => FormInstance<any> | null | undefined,
): () => void {
  // Answers each request with the form of the moment; keeps no subscribers.
  const listener = (event: Event) => {
    const request = event as ContextRequestEvent<FormContext>;
    if (request.context !== formContext) return;
    if ((request.contextTarget ?? event.composedPath()[0]) === target) return;
    const form = getForm();
    if (!form) return;
    event.stopImmediatePropagation();
    request.callback(form);
  };

  target.addEventListener('context-request', listener);
  const detachLegacy = answerLegacyFormRequests(target, getForm);
  // Announce, so subscribed consumers that asked before this provider existed resolve now.
  target.dispatchEvent(new ContextProviderEvent(formContext, target));

  return () => {
    target.removeEventListener('context-request', listener);
    detachLegacy();
  };
}
