/**
 * Zod schema integration for @willram/forms.
 *
 * Import from `@willram/forms/zod` — this keeps the Zod dependency
 * out of the core bundle.
 *
 * Uses structural typing so it works with any Zod-compatible library
 * (Zod v3, v4, or anything with the same `.shape` / `.safeParse` API).
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createForm } from '@willram/forms';
 * import { zodValidator } from '@willram/forms/zod';
 *
 * const schema = z.object({
 *   email: z.string().min(1, 'Required').email(),
 *   password: z.string().min(8, 'Too short'),
 * });
 *
 * form = createForm(this, {
 *   initialValues: { email: '', password: '' },
 *   validators: zodValidator(schema),
 *   onSubmit: async ({ value }) => { ... },
 * });
 * ```
 */

import type { Validator } from './types.ts';

// ---------------------------------------------------------------------------
// Structural types — we never import 'zod' directly.
// Anything with .shape + .safeParse will work.
// ---------------------------------------------------------------------------

interface ZodLikeIssue {
  message: string;
  path: ReadonlyArray<string | number>;
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

// ---------------------------------------------------------------------------
// zodValidator — extract per-field validators from a Zod object schema
// ---------------------------------------------------------------------------

/**
 * Create per-field validators from a Zod object schema.
 *
 * Returns a `validators` config object that can be passed directly to
 * `createForm`:
 *
 * ```ts
 * createForm(this, {
 *   initialValues: { ... },
 *   validators: zodValidator(schema),
 * })
 * ```
 *
 * Each top-level key in the schema's `.shape` gets a `Validator` that runs
 * `fieldSchema.safeParse(value)` and reports the first error.
 */
export function zodValidator(
  schema: ZodLikeObjectSchema,
): Record<string, Validator[]> {
  const result: Record<string, Validator[]> = {};

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    result[key] = [makeFieldValidator(fieldSchema)];
  }

  return result;
}

/**
 * Create a single `Validator` from a Zod type (e.g. `z.string().email()`).
 *
 * Useful when you want to mix Zod validation with manual validators on
 * a single field:
 *
 * ```ts
 * validators: {
 *   email: {
 *     validators: [zodFieldValidator(z.string().email())],
 *     asyncValidators: [checkUniqueness()],
 *     validateOn: 'change',
 *   }
 * }
 * ```
 */
export function zodFieldValidator(fieldSchema: ZodLikeType): Validator {
  return makeFieldValidator(fieldSchema);
}

/**
 * Create a form-level validator from a Zod object schema.
 *
 * Validates ALL fields at once against the full schema. Useful for
 * cross-field refinements (`.refine()`, `.superRefine()`).
 *
 * Errors are returned as `Record<string, string>` mapping field paths
 * to messages. Refinement errors without a path become form-level errors.
 *
 * ```ts
 * createForm(this, {
 *   initialValues: { ... },
 *   validators: zodValidator(schema),          // per-field
 *   formValidators: [zodFormValidator(schema)], // cross-field
 * })
 * ```
 */
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
        const fieldPath = issue.path.join('.');
        // Keep only the first error per field
        if (!(fieldPath in errors)) {
          errors[fieldPath] = issue.message;
        }
      } else {
        formErrors.push(issue.message);
      }
    }

    // If there are only path-less errors, return as a single string
    if (Object.keys(errors).length === 0) {
      return formErrors.length > 0 ? formErrors.join('; ') : undefined;
    }

    return errors;
  };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function makeFieldValidator(fieldSchema: ZodLikeType): Validator {
  return (value: unknown) => {
    const result = fieldSchema.safeParse(value);
    if (result.success) return undefined;
    return result.error?.issues[0]?.message;
  };
}
