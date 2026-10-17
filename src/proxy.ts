import {NextResponse, type NextRequest} from 'next/server';
import {updateSession} from '@/lib/supabase/middleware';
import {DESIGN_CONSOLE_PATH} from '@/utils/authRedirect';

/** True for the Design Console and its scenario pages. */
const isDesignConsolePath = (pathname: string) =>
  pathname === DESIGN_CONSOLE_PATH ||
  pathname.startsWith(`${DESIGN_CONSOLE_PATH}/`);

export const proxy = async (request: NextRequest) => {
  // Local dev only: the Design Console needs no session, so agents can browse
  // and screenshot it without signing in. NODE_ENV is inlined at build time,
  // so production builds (Vercel previews included) keep the auth gate.
  if (
    process.env.NODE_ENV === 'development' &&
    isDesignConsolePath(request.nextUrl.pathname)
  ) {
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
     * - Public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/mcp|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
