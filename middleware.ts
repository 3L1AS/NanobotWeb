import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware runs in Edge Runtime and cannot share memory with Node.js runtime
// So we do a simple token existence check here
// The API routes will do proper validation with the session store

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public paths that do not require authentication
    if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    // Check for the authentication token
    const token = request.cookies.get('nanobot-auth-token')?.value;

    // Simple check: token must exist and be a valid hex string (64 chars)
    const isValidFormat = token && /^[a-f0-9]{64}$/.test(token);

    if (!isValidFormat) {
        console.log(`[Middleware] No valid token found for ${pathname}`);

        // If it's an API route, send 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Otherwise redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
    }

    console.log(`[Middleware] Token present for ${pathname}`);

    // Add security headers to all responses
    const response = NextResponse.next();

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Content Security Policy
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline and unsafe-eval
        "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
    ];
    response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

    return response;
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
