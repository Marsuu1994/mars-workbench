/** Why a native API request was refused, as the `error.code` of its answer. */
export const ApiErrorCode = {
  UNAUTHORIZED: 'unauthorized',
  INVALID_BODY: 'invalid_body',
  UNEXPECTED: 'unexpected',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.INVALID_BODY]: 400,
  [ApiErrorCode.UNEXPECTED]: 500,
};

export const BEARER_SCHEME = 'bearer';
