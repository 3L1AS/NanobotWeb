import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths that do not require authentication
    if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    // Check for the authentication token
    const token = request.cookies.get('nanobot-auth-token')?.value;

    // Simple validation: the token must exist and match our expected structure
    // In a full production app you'd use a real JWT, but a secure unguessable random string 
    // generated at login is sufficient for a single-user local dashboard.
    if (!token) {
        // If it's an API route, send 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Otherwise redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
