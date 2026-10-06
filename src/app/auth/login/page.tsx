'use client';

import {use, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {LoginScreen} from '@/components/domain/auth/LoginScreen';
import {
  AUTH_CALLBACK_PATH,
  getSafeNextPath,
  withNextParam,
} from '@/utils/authRedirect';

interface LoginPageProps {
  searchParams: Promise<{next?: string | string[]}>;
}

const LoginPage = ({searchParams}: LoginPageProps) => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const {next} = use(searchParams);
  const nextPath = getSafeNextPath(typeof next === 'string' ? next : null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({data: {user}}) => {
      if (user) {
        router.replace(nextPath);
      } else {
        setChecking(false);
      }
    });
  }, [router, nextPath]);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${withNextParam(AUTH_CALLBACK_PATH, nextPath)}`,
      },
    });
  };

  if (checking) {
    return null;
  }

  return <LoginScreen onGoogleSignIn={handleGoogleSignIn} />;
};

export default LoginPage;
