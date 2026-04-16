import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// CRM routes that require Supabase Auth session
const CRM_PROTECTED = ['/dashboard', '/prospecting', '/leadboard', '/outreach', '/responses', '/settings'];
const CRM_AUTH_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCrmProtected = CRM_PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isCrmAuth = CRM_AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isCrmProtected || isCrmAuth) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]));
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (isCrmProtected && !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isCrmAuth && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  }

  // All other routes (Workspace, SEO) — pass through, PIN auth is client-side
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|seoagent|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
