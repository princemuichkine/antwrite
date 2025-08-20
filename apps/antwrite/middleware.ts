import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // Redirect unauthenticated users away from protected routes
  if (pathname.startsWith('/documents')) {
    if (!sessionCookie) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      return NextResponse.redirect(homeUrl);
    }
  }

  if (sessionCookie && pathname === '/') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/documents';
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/documents/:path*'],
};
