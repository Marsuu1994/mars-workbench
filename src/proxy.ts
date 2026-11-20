import {NextResponse, type NextRequest} from 'next/server';
import {updateSession} from '@/lib/supabase/middleware';
import {DESIGN_CONSOLE_PATH} from '@/utils/authRedirect';

/** True for the Design Console and its scenario pages. */
const isDesignConsolePath = (pathname: string) =>
  pathname === DESIGN_CONSOLE_PATH ||
  pathname.startsWith(`${DESIGN_CONSOLE_PATH}/`);

export const proxy = async (request: NextRequest) => {
  // The Design Console is public: it renders fixtures only and never reads a
  // user's data, so anyone can open it without signing in, in every build.
  if (isDesignConsolePath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
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
     * - sw.js and manifest.json (PWA files the login page loads too: a
     *   service worker script may not arrive through a redirect, and a
     *   redirected manifest parses as HTML)
     * - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/mcp|\\.well-known|sw\\.js$|manifest\\.json$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
