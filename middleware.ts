import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all requests — auth is handled client-side via PIN system
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match paths that need middleware processing (currently none)
    '/((?!_next/static|_next/image|favicon.ico|api|seoagent|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
