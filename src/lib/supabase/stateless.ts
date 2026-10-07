import {createClient, type SupabaseClient} from '@supabase/supabase-js';

let statelessClient: SupabaseClient | undefined;

/**
 * A Supabase client with no session and no cookies, for requests that
 * authenticate with a bearer token instead of the browser session (MCP
 * clients). Created on first use, once per server instance.
 */
export const getStatelessClient = (): SupabaseClient => {
  statelessClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return statelessClient;
};
