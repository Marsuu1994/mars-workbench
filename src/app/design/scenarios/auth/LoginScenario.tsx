'use client';

import {LoginScreen} from '@/components/domain/auth/LoginScreen';

const NOOP = () => undefined;

/**
 * The real LoginScreen against a no-op sign-in handler, inside a frame-safe
 * stand-in for the login layout's full-viewport centering, in a page-mode
 * frame (flex-1, not min-h-screen). The screen's fixed background layers anchor to the frame
 * via its [contain:layout].
 */
export const LoginScenario = () => (
  <div className="flex flex-1 items-center justify-center overflow-hidden">
    <LoginScreen onGoogleSignIn={NOOP} />
  </div>
);
