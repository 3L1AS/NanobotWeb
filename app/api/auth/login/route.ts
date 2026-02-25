import { NextResponse } from 'next/server';
import { createSession } from '../../../lib/auth';
import { isRateLimited, clearRateLimit } from '../../../lib/security';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();

        // Get client identifier for rate limiting (use IP or a fallback)
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

        // Check rate limiting (5 attempts per 15 minutes)
        if (isRateLimited(ip)) {
            console.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429 }
            );
        }

        // Validate input
        if (!password || typeof password !== 'string') {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const systemPassword = process.env.DASHBOARD_PASSWORD || 'admin';

        // Warn if using default password
        if (systemPassword === 'admin') {
            console.warn('[Security] WARNING: Using default password "admin". Please change DASHBOARD_PASSWORD environment variable!');
        }

        if (password === systemPassword) {
            // Generate and store a session token server-side
            const token = createSession();

            const response = NextResponse.json({ success: true });

            // Clear rate limit on successful login
            clearRateLimit(ip);

            const isSecure = req.url.startsWith('https://') || req.headers.get('x-forwarded-proto') === 'https';

            // Set HttpOnly cookie with security flags
            response.cookies.set({
                name: 'nanobot-auth-token',
                value: token,
                httpOnly: true,
                path: '/',
                secure: isSecure,
                sameSite: 'lax', // 'lax' works with HTTP and reverse proxies, still provides good CSRF protection
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });

            console.log(`[Auth] Successful login from IP: ${ip}`);
            console.log(`[Auth] Cookie set - Token: ${token.substring(0, 16)}..., Secure: ${isSecure}, SameSite: lax`);
            return response;
        }

        console.warn(`[Security] Failed login attempt from IP: ${ip}`);
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error: any) {
        console.error(`[Auth] Login error: ${error.message}`);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
