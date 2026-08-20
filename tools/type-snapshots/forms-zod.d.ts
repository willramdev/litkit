/** Synchronous field validator. Returns an error message or `undefined` if valid. */
export type Validator<T = unknown> = (value: T) => string | undefined;
export interface ZodLikeIssue {
	message: string;
	path: ReadonlyArray<PropertyKey>;
}
export interface ZodLikeError {
	issues: readonly ZodLikeIssue[];
}
export interface ZodLikeResult {
	success: boolean;
	error?: ZodLikeError;
}
export interface ZodLikeType {
	safeParse(value: unknown): ZodLikeResult;
}
export interface ZodLikeObjectSchema {
	shape: Record<string, ZodLikeType>;
	safeParse(value: unknown): ZodLikeResult;
}
export declare function zodValidator(schema: ZodLikeObjectSchema): Record<string, Validator[]>;
export declare function zodFieldValidator(fieldSchema: ZodLikeType): Validator;
export declare function zodFormValidator<T>(schema: ZodLikeObjectSchema): (values: T) => Record<string, string> | string | undefined;

export {};
