'use client';

import {LoginScreen} from '@/components/domain/auth/LoginScreen';

const NOOP = () => undefined;

/**
 * The real LoginScreen against a no-op sign-in handler, inside a frame-safe
 * stand-in for the login layout's full-viewport centering (h-full, not
 * min-h-screen). The screen's fixed background layers anchor to the frame
 * via its [contain:layout].
 */
export const LoginScenario = () => (
  <div className="flex h-full items-center justify-center overflow-hidden">
    <LoginScreen onGoogleSignIn={NOOP} />
  </div>
);
