import {NextRequest, NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const GET = async (request: NextRequest) => {
  const {searchParams, origin} = request.nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(origin);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
};
