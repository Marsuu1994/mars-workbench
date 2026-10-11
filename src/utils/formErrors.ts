/** A server action's validation error, as zod's `flatten()` shapes it. */
export interface FlattenedFormError {
  formErrors: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

const isFlattenedFormError = (error: object): error is FlattenedFormError =>
  'formErrors' in error;

/**
 * One line for a form's error banner from a server action's `error`: the
 * form-level messages plus every field message, so a validation failure with
 * empty formErrors (e.g. a missing required field) never shows blank.
 */
export function toFormErrorMessage(error: object): string {
  if (!isFlattenedFormError(error)) return JSON.stringify(error);
  const fieldMessages = Object.values(error.fieldErrors ?? {}).flatMap(
    messages => messages ?? [],
  );
  return [...error.formErrors, ...fieldMessages].join(', ');
}
