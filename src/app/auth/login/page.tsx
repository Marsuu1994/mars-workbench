'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {LoginScreen} from '@/components/domain/auth/LoginScreen';

const LoginPage = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({data: {user}}) => {
      if (user) {
        router.push('/');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  if (checking) {
    return null;
  }

  return <LoginScreen onGoogleSignIn={handleGoogleSignIn} />;
};

export default LoginPage;
