import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/llcs', '/portal'];

// Routes that should redirect to app if already authenticated
const AUTH_ROUTES = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  // Check if the route is protected
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Check if it's an auth route (login)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // If protected and no session, redirect to login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If on login page and has session, redirect to app
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/llcs', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
