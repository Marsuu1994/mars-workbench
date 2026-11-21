import {createHash, timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {BEARER_SCHEME} from '../constants';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * The user a native-app request acts as: `NATIVE_API_USER_ID`, when the
 * request's bearer token is `NATIVE_API_TOKEN`. Undefined for any other
 * request, and for every request while either variable is unset or the user
 * id isn't a UUID, so a deployment that was never configured refuses them all.
 *
 * One fixed token for one user, until the native app signs in with Supabase
 * (`design/spike/ios-dump-capture.md`). The two sides are hashed before they
 * are compared, so the comparison takes the same time whatever the token.
 */
export const getNativeApiUserId = (request: Request): string | undefined => {
  const {NATIVE_API_TOKEN, NATIVE_API_USER_ID} = process.env;
  const {success, data: userId} = z
    .string()
    .uuid()
    .safeParse(NATIVE_API_USER_ID);
  if (!NATIVE_API_TOKEN || !success) return undefined;

  const [scheme, token] = (request.headers.get('authorization') ?? '').split(
    ' ',
  );
  if (scheme?.toLowerCase() !== BEARER_SCHEME || !token) return undefined;

  return timingSafeEqual(sha256(token), sha256(NATIVE_API_TOKEN))
    ? userId
    : undefined;
};
