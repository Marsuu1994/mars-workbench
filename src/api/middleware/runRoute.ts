import type {z} from 'zod';
import {API_ERROR_STATUS, ApiErrorCode} from '../constants';
import {getNativeApiUserId} from './auth';

const errorResponse = (code: ApiErrorCode, details: object = {}) =>
  Response.json({error: {code, ...details}}, {status: API_ERROR_STATUS[code]});

/**
 * Run a native API route as the calling user and shape its HTTP answer: 401
 * without the right token, 400 when the body isn't JSON or doesn't match the
 * route's schema (nothing is written), the route's result as JSON on success,
 * and anything else logged and answered with 500, so no database detail
 * reaches the client. The native API's counterpart of the MCP tools' runTool.
 */
export const runRoute = async <Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  routeFunction: (
    userId: string,
    input: z.output<Schema>,
  ) => Promise<Record<string, unknown>>,
): Promise<Response> => {
  const userId = getNativeApiUserId(request);
  if (!userId) return errorResponse(ApiErrorCode.UNAUTHORIZED);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ApiErrorCode.INVALID_BODY);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(ApiErrorCode.INVALID_BODY, {
      issues: parsed.error.issues,
    });
  }

  try {
    return Response.json(await routeFunction(userId, parsed.data));
  } catch (error) {
    console.error('Native API route failed:', error);
    return errorResponse(ApiErrorCode.UNEXPECTED);
  }
};
