/**
 * Zod schema integration for @willram/forms.
 *
 * Import from `@willram/forms/zod` — this keeps the Zod dependency
 * out of the core bundle.
 *
 * Uses structural typing so it works with any Zod-compatible library
 * (Zod v3, v4, or anything with the same `.shape` / `.safeParse` API).
 */

import type { Validator } from './types.ts';

interface ZodLikeIssue {
  message: string;
  path: ReadonlyArray<PropertyKey>;
}

interface ZodLikeError {
  issues: readonly ZodLikeIssue[];
}

interface ZodLikeResult {
  success: boolean;
  error?: ZodLikeError;
}

interface ZodLikeType {
  safeParse(value: unknown): ZodLikeResult;
}

interface ZodLikeObjectSchema {
  shape: Record<string, ZodLikeType>;
  safeParse(value: unknown): ZodLikeResult;
}

export function zodValidator(
  schema: ZodLikeObjectSchema,
): Record<string, Validator[]> {
  const result: Record<string, Validator[]> = {};

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    result[key] = [makeFieldValidator(fieldSchema)];
  }

  return result;
}

export function zodFieldValidator(fieldSchema: ZodLikeType): Validator {
  return makeFieldValidator(fieldSchema);
}

export function zodFormValidator<T>(
  schema: ZodLikeObjectSchema,
): (values: T) => Record<string, string> | string | undefined {
  return (values: T) => {
    const result = schema.safeParse(values);
    if (result.success) return undefined;

    const errors: Record<string, string> = {};
    const formErrors: string[] = [];

    for (const issue of result.error!.issues) {
      if (issue.path.length > 0) {
        const fieldPath = issue.path.map(String).join('.');
        if (!(fieldPath in errors)) {
          errors[fieldPath] = issue.message;
        }
      } else {
        formErrors.push(issue.message);
      }
    }

    if (Object.keys(errors).length === 0) {
      return formErrors.length > 0 ? formErrors.join('; ') : undefined;
    }

    return errors;
  };
}

function makeFieldValidator(fieldSchema: ZodLikeType): Validator {
  return (value: unknown) => {
    const result = fieldSchema.safeParse(value);
    if (result.success) return undefined;
    return result.error?.issues[0]?.message;
  };
}
