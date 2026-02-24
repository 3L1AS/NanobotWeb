import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();
        const systemPassword = process.env.DASHBOARD_PASSWORD || 'admin';

        if (password === systemPassword) {
            // Generate a simple random token for the session
            const token = crypto.randomBytes(32).toString('hex');

            const response = NextResponse.json({ success: true });

            // Set HttpOnly cookie
            response.cookies.set({
                name: 'nanobot-auth-token',
                value: token,
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
