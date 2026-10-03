import {type NextRequest} from 'next/server';
import {updateSession} from '@/lib/supabase/middleware';

export const proxy = async (request: NextRequest) => {
  return await updateSession(request);
};

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser favicon)
     * - api/mcp (MCP endpoint: clients carry no session cookie and must get
     *   the endpoint's own response, never a redirect to the login page)
     * - .well-known (OAuth discovery metadata, fetched without a session)
     * - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/mcp|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
