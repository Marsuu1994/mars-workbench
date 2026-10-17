'use client';

import {AuthBackdrop} from './AuthBackdrop';
import {BrandIcon} from './BrandIcon';
import {GoogleLogo} from './GoogleLogo';

interface LoginScreenProps {
  onGoogleSignIn: () => void;
}

/**
 * The login screen itself — atmosphere, brand, and the Google button. Kept
 * presentational (the auth gate and OAuth call live in the login page) so
 * design scenarios can render it against a no-op handler.
 */
export const LoginScreen = ({onGoogleSignIn}: LoginScreenProps) => (
  <>
    <AuthBackdrop />

    {/* Card */}
    <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center gap-10 px-10 py-12">
      {/* Brand */}
      <div className="flex animate-[fadeUp_0.6s_ease_0.1s_forwards] flex-col items-center gap-5 opacity-0">
        <BrandIcon />
        <h1 className="font-[family-name:var(--font-sans)] text-[26px] font-bold tracking-tight text-base-content">
          <span className="bg-linear-to-br from-primary to-secondary bg-clip-text text-transparent">
            Mars
          </span>{' '}
          Workbench
        </h1>
        <p className="text-[15px] font-light tracking-wide text-base-content/45">
          Plan. Focus. Ship.
        </p>
      </div>

      {/* Sign-in body */}
      <div className="flex w-full animate-[fadeUp_0.6s_ease_0.25s_forwards] flex-col items-center gap-6 opacity-0">
        {/* Gradient divider */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-base-content/8 to-transparent" />

        {/* Google button */}
        <button
          onClick={onGoogleSignIn}
          className="login-google-btn group relative flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl border border-base-content/10 bg-neutral px-6 py-3.5 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:border-primary/25 active:translate-y-0"
        >
          <div className="absolute inset-0 rounded-xl bg-linear-to-br from-primary/5 to-secondary/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <span className="relative z-10">
            <GoogleLogo />
          </span>
          <span className="relative z-10">Sign in with Google</span>
        </button>
      </div>

      {/* Footer */}
      <p className="animate-[fadeUp_0.6s_ease_0.4s_forwards] text-center text-xs leading-relaxed tracking-wide text-base-content/25 opacity-0">
        By signing in you agree to our terms of use.
      </p>
    </div>
  </>
);
