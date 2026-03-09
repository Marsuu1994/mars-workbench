"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GoogleLogo = () => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 shrink-0"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const BrandIcon = () => (
  <div className="flex h-14 w-14 animate-[glow_4s_ease-in-out_infinite_alternate] items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary shadow-[0_0_40px_rgba(0,212,240,0.15),0_0_80px_rgba(168,85,247,0.08)]">
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 fill-none stroke-white"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  </div>
);

const LoginPage = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push("/");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  if (checking) {
    return null;
  }

  return (
    <>
      {/* Atmospheric background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            "radial-gradient(ellipse 60% 50% at 50% 100%, var(--login-glow-cyan) 0%, transparent 70%)",
            "radial-gradient(ellipse 40% 40% at 20% 20%, var(--login-glow-purple) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 50% at 80% 30%, var(--login-glow-rose) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[size:64px_64px]"
        style={{
          backgroundImage: [
            "linear-gradient(var(--login-grid-color) 1px, transparent 1px)",
            "linear-gradient(90deg, var(--login-grid-color) 1px, transparent 1px)",
          ].join(", "),
        }}
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center gap-10 px-10 py-12">
        {/* Brand */}
        <div className="flex animate-[fadeUp_0.6s_ease_0.1s_forwards] flex-col items-center gap-5 opacity-0">
          <BrandIcon />
          <h1 className="font-[family-name:var(--font-sans)] text-[26px] font-bold tracking-tight text-base-content">
            <span className="bg-linear-to-br from-primary to-secondary bg-clip-text text-transparent">
              Mars
            </span>{" "}
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
            onClick={handleGoogleSignIn}
            className="login-google-btn group relative flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl border border-base-content/10 bg-neutral px-6 py-3.5 text-[15px] font-medium text-base-content transition-all duration-200 hover:-translate-y-px hover:border-primary/25 active:translate-y-0"
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
};

export default LoginPage;
