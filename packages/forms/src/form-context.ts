import type { FormInstance } from './types.ts';

export const LIT_FORM_REQUEST = 'lit-form:request-form';

type FormRequestDetail = {
  respond: (form: FormInstance<any>) => void;
};

function isFormRequestEvent(event: Event): event is CustomEvent<FormRequestDetail> {
  return event.type === LIT_FORM_REQUEST;
}

export function requestFormContext(target: EventTarget): FormInstance<any> | undefined {
  let resolvedForm: FormInstance<any> | undefined;

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

export function attachFormProvider(
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
